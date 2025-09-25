import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionGroup,
  AlertVariant,
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  NumberInput,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Switch,
  Title,
  Tooltip,
} from "@patternfly/react-core";
import { InfoCircleIcon } from "@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../context/realm-context/RealmContext";
import { useSubGroups } from "./SubGroupsContext";
import { useAlerts } from "@keycloak/keycloak-ui-shared";
import { getAuthorizationHeaders } from "../utils/getAuthorizationHeaders";
import { fetchWithError } from "@keycloak/keycloak-admin-client";

// Constants
const TOZNY_JIRA_PLUGIN_TYPE = "jira" as const;

// Types matching the angular implementation structures
interface PamPlugin {
  id: string;
  name: string;
  authHeader?: string;
}

interface PamPlugins {
  jira: PamPlugin[];
}

interface MpcRealmSettings {
  realmName: string;
  enabled: boolean;
  defaultRequiredApprovers: number;
  defaultAccessDurationSeconds: number;
  jiraEnabledForRealm: boolean;
}

// Extend to include client roles info if needed in future
type ToznyRole = RoleRepresentation & {
  client_role?: boolean;
  container_id?: string;
};

interface MpcSettings {
  id?: string;
  approverRoles: ToznyRole[];
  enabled: boolean;
  requiredApprovals: number;
  accessDurationSeconds: number;
  jiraControlled: boolean;
  jiraPlugin: PamPlugin | false;
  jiraBoardId?: number;
}

interface ApiPamSettings {
  settings: {
    mpc_enabled_for_realm: boolean;
    default_access_duration_seconds: number;
    default_required_approvals: number;
    plugins: {
      jira?: Array<{
        id: number;
        jira_host_url: string;
        bot_user_email: string;
        automation_auth_header?: string;
      }>;
    };
  };
  groups: Array<{
    id: string;
    access_policies: Array<{
      id?: string;
      approval_roles?: ToznyRole[];
      required_approvals?: number;
      max_access_duration_seconds?: number;
      plugin_type?: string;
      plugin_id?: string | number;
      plugin_mpc_flow_source?: string;
    }>;
  }>;
}

function buildUserFacingPamPlugins(apiPlugins: ApiPamSettings["settings"]["plugins"]): PamPlugins {
  return {
    jira: (apiPlugins.jira || []).map((p) => ({
      id: String(p.id),
      name: `${p.jira_host_url.replace(/^https:\/\//, "")} - ${p.bot_user_email}`,
      authHeader: p.automation_auth_header,
    })),
  };
}

function policyIsEnabled(policy: NonNullable<ApiPamSettings["groups"][number]["access_policies"]>[number]) {
  if (policy.plugin_type) return true;
  return (policy.approval_roles || []).length > 0;
}

function mpcSettingsAreValid(m: MpcSettings) {
  if (!m.enabled) return true;
  if (m.jiraControlled) {
    return Boolean((m.jiraPlugin as PamPlugin | false) && (m.jiraPlugin as PamPlugin).id) && !!m.jiraBoardId && m.jiraBoardId > 0;
  }
  return (m.approverRoles || []).length > 0;
}

export default function GroupMpcSettings() {
  const { t } = useTranslation();
  const { adminClient } = useAdminClient();
  const { realm } = useRealm();
  const { currentGroup } = useSubGroups();
  const { addAlert, addError } = useAlerts();

  const group = currentGroup();
  const groupId = group?.id || "";

  // Roles for approver list (realm roles only for now)
  const [roles, setRoles] = useState<ToznyRole[]>([]);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  // PAM + MPC settings state
  const [realmSettings, setRealmSettings] = useState<MpcRealmSettings>({
    realmName: realm,
    enabled: false,
    defaultRequiredApprovers: 1,
    defaultAccessDurationSeconds: 10800,
    jiraEnabledForRealm: false,
  });
  const [pamPlugins, setPamPlugins] = useState<PamPlugins>({ jira: [] });
  const [settings, setSettings] = useState<MpcSettings>({
    approverRoles: [],
    enabled: false,
    requiredApprovals: 1,
    accessDurationSeconds: 10800,
    jiraControlled: false,
    jiraPlugin: false,
    jiraBoardId: undefined,
  });

  const [loaded, setLoaded] = useState(false);
  const [changed, setChanged] = useState(false);
  const initialRef = useRef<MpcSettings | null>(null);
  const [jiraOpen, setJiraOpen] = useState(false);

  // Load roles
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const found = await adminClient.roles.find();
        if (!ignore) {
          setRoles(found as ToznyRole[]);
          setRolesLoaded(true);
        }
      } catch (e) {
        // Roles failing to load should not block UI completely
        // but it will prevent selecting approver roles.
        console.error("Failed to load realm roles", e);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [adminClient]);

  // Load current MPC policy and realm config
  useEffect(() => {
    if (!groupId) return;
    let ignore = false;
    (async () => {
      try {
        const accessToken = await adminClient.getAccessToken();
        const baseUrl = adminClient.baseUrl.replace(/\/?$/, "/");
        // GET /realms/{realm}/pam/policies?realm_name={realm}&group_ids={groupId}
        const url = `${baseUrl}realms/${encodeURIComponent(realm)}/pam/policies?` +
          new URLSearchParams({ realm_name: realm, group_ids: groupId }).toString();

        const response = await fetchWithError(url, {
          method: "GET",
          headers: getAuthorizationHeaders(accessToken),
        });
        const data = (await response.json()) as ApiPamSettings;

        const pam = data.settings;
        const groups = data.groups || [];
        const current = groups[0]?.access_policies?.[0] || {};
        const enabledForGroup = current && policyIsEnabled(current);
        const plugins = buildUserFacingPamPlugins(pam.plugins || {});

        const jiraControlled = current.plugin_type === TOZNY_JIRA_PLUGIN_TYPE;
        const jiraPlugin = jiraControlled
          ? plugins.jira.find((p) => p.id === String(current.plugin_id)) || false
          : false;
        const jiraBoardId = jiraControlled && current.plugin_mpc_flow_source
          ? parseInt(current.plugin_mpc_flow_source, 10)
          : undefined;

        const mpcRealm: MpcRealmSettings = {
          realmName: realm,
          enabled: pam.mpc_enabled_for_realm,
          defaultRequiredApprovers: pam.default_required_approvals,
          defaultAccessDurationSeconds: pam.default_access_duration_seconds,
          jiraEnabledForRealm: (plugins.jira || []).length > 0,
        };

        const mpcSettings: MpcSettings = {
          id: current.id || undefined,
          approverRoles: (current.approval_roles || []) as ToznyRole[],
          enabled: !!enabledForGroup,
          requiredApprovals: current.required_approvals ?? pam.default_required_approvals,
          accessDurationSeconds: current.max_access_duration_seconds ?? pam.default_access_duration_seconds,
          jiraControlled,
          jiraPlugin,
          jiraBoardId,
        };

        if (!ignore) {
          setPamPlugins(plugins);
          setRealmSettings(mpcRealm);
          setSettings(mpcSettings);
          initialRef.current = JSON.parse(JSON.stringify(mpcSettings));
          setChanged(false);
          setLoaded(true);
        }
      } catch (e) {
        if (!ignore) {
          console.error(e);
          addError("somethingWentWrong", e);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [adminClient, realm, groupId, addError]);

  // Track changed state (deep compare)
  useEffect(() => {
    if (!loaded || !initialRef.current) return;
    setChanged(JSON.stringify(settings) !== JSON.stringify(initialRef.current));
  }, [settings, loaded]);

  // Handlers
  const save = async () => {
    try {
      if (!mpcSettingsAreValid(settings)) return;
      const accessToken = await adminClient.getAccessToken();
      const baseUrl = adminClient.baseUrl.replace(/\/?$/, "/");

      const policy: any = {
        id: settings.id,
        approval_roles: settings.enabled ? settings.approverRoles : [],
        required_approvals: settings.requiredApprovals,
        max_access_duration_seconds: settings.accessDurationSeconds,
      };
      if (settings.enabled && settings.jiraControlled) {
        policy.plugin_type = TOZNY_JIRA_PLUGIN_TYPE;
        policy.plugin_id = settings.jiraPlugin && (settings.jiraPlugin as PamPlugin).id;
        policy.plugin_mpc_flow_source = String(settings.jiraBoardId || "");
      }

      const putBody = {
        realm_name: realmSettings.realmName,
        group: {
          id: groupId,
          access_policies: [policy],
        },
      };

      const putUrl = `${baseUrl}realms/${encodeURIComponent(realm)}/pam/policies`;
      const res = await fetchWithError(putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthorizationHeaders(accessToken),
        },
        body: JSON.stringify(putBody),
      });

      // Response may contain the upserted policy id
      const json = await res.json().catch(() => undefined);
      const newId = json?.group?.access_policies?.[0]?.id as string | undefined;

      const next: MpcSettings = { ...settings, id: settings.id || newId };
      initialRef.current = JSON.parse(JSON.stringify(next));
      setSettings(next);
      setChanged(false);
      addAlert(t("successfullySaved"), AlertVariant.success);
    } catch (e) {
      console.error(e);
      addError("somethingWentWrong", e);
    }
  };

  const reset = () => {
    if (initialRef.current) setSettings(JSON.parse(JSON.stringify(initialRef.current)));
  };

  // UI helpers
  const selectedRoles = useMemo(() => new Set((settings.approverRoles || []).map((r) => r.name)), [settings.approverRoles]);

  const onRoleSelect = (_event: unknown, value?: string | number) => {
    const role = roles.find((r) => r.name === String(value));
    if (!role) return;
    const exists = settings.approverRoles.some((r) => r.id === role.id);
    const next = exists
      ? settings.approverRoles.filter((r) => r.id !== role.id)
      : [...settings.approverRoles, role as ToznyRole];
    setSettings({ ...settings, approverRoles: next });
  };

  const ApproverRolesSelect = (
    <Select
    aria-label="approver-roles"
    isOpen={rolesOpen}
    onOpenChange={setRolesOpen}
    toggle={(toggleRef) => (
      <MenuToggle
        ref={toggleRef}
        isExpanded={rolesOpen}
        onClick={() => setRolesOpen(!rolesOpen)}
        isFullWidth
      >
        {selectedRoles.size > 0
          ? [...selectedRoles].join(", ")
          : t("selectOneOrMore")}
      </MenuToggle>
    )}
  >
    <SelectList style={{ maxHeight: 300, overflow: "auto", width: "100%" }}>
      {(roles || [])
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((r) => (
          <SelectOption
            key={r.id}
            value={r.name || ""}
            selected={selectedRoles.has(r.name || "")}
            isDisabled={settings.jiraControlled}
            onClick={() => onRoleSelect(null, r.name || "")}
          />
        ))}
    </SelectList>
  </Select>
  );

  if (!groupId) return null;

  return (
    <div className="pf-v5-u-mt-lg pf-v5-u-ml-lg">
      <Form
        isHorizontal
        style={{
          [
            "--pf-v5-c-form--m-horizontal__group--md--GridTemplateColumns" as any
          ]: "360px 1fr",
        }}
      >
      {realmSettings.enabled && (
        <>
          <Title headingLevel="h2" className="pf-v5-u-mb-md">
            {t("mpcSettingsTitle", { defaultValue: "Multi-party Control (MPC) Settings" })}
          </Title>

          <FormGroup label={<span className="pf-v5-u-text-nowrap">{t("mpcEnableLabel", { defaultValue: "Enable multi-party control for group" })}</span>} fieldId="mpc-enabled">
            <Switch
              id="mpc-enabled"
              isChecked={settings.enabled}
              onChange={(_event: unknown, checked: boolean) => setSettings({ ...settings, enabled: !!checked })}
              label="ON"
              labelOff="OFF"
            />
          </FormGroup>

          {settings.enabled && (
            <>
              <FormGroup
                label={
                  <>
                    <span className="pf-v5-u-text-nowrap">{t("mpcApproverRolesLabel", { defaultValue: "Users with the following roles can grant permissions" })}</span> <span className="pf-v5-u-danger-color-100">*</span>
                  </>
                }
                fieldId="approver-roles"
              >
                {ApproverRolesSelect}
              </FormGroup>

              <FormGroup
                label={<span className="pf-v5-u-text-nowrap">{t("mpcMaxDurationLabel", { defaultValue: "Maximum access policy duration in seconds" })}</span>}
                fieldId="access-duration"
              >
                <NumberInput
                  id="access-duration"
                  value={settings.accessDurationSeconds}
                  min={1}
                  onMinus={() =>
                    setSettings({ ...settings, accessDurationSeconds: Math.max(1, (settings.accessDurationSeconds || 1) - 1) })
                  }
                  onPlus={() => setSettings({ ...settings, accessDurationSeconds: (settings.accessDurationSeconds || 0) + 1 })}
                  onChange={(event: any) =>
                    setSettings({
                      ...settings,
                      accessDurationSeconds: Number((event.currentTarget as HTMLInputElement).value) || 0,
                    })
                  }
                  style={{ width: "100%" }}
                />
                <div className="pf-v5-u-mt-sm">
                  <HelperText>
                    <HelperTextItem icon={<InfoCircleIcon />}>{t("mpcMaxDurationHelp", { seconds: realmSettings.defaultAccessDurationSeconds, defaultValue: `The maximum time that the access policy will last once approved. Defaults to ${realmSettings.defaultAccessDurationSeconds} seconds.` })}</HelperTextItem>
                  </HelperText>
                </div>
              </FormGroup>

              <FormGroup
                label={<span className="pf-v5-u-text-nowrap">{t("mpcRequiredApprovalsLabel", { defaultValue: "Number of approvals required" })}</span>}
                fieldId="required-approvals"
              >
                <NumberInput
                  id="required-approvals"
                  value={settings.requiredApprovals}
                  min={1}
                  onMinus={() =>
                    setSettings({ ...settings, requiredApprovals: Math.max(1, (settings.requiredApprovals || 1) - 1) })
                  }
                  onPlus={() => setSettings({ ...settings, requiredApprovals: (settings.requiredApprovals || 0) + 1 })}
                  onChange={(event: any) =>
                    setSettings({
                      ...settings,
                      requiredApprovals: Number((event.currentTarget as HTMLInputElement).value) || 0,
                    })
                  }
                  style={{ width: 600 }}
                />
                <div className="pf-v5-u-mt-sm">
                  <HelperText>
                    <HelperTextItem icon={<InfoCircleIcon />}>{t("mpcRequiredApprovalsHelp", { count: realmSettings.defaultRequiredApprovers, defaultValue: `Defaults to ${realmSettings.defaultRequiredApprovers} approver(s).` })}</HelperTextItem>
                  </HelperText>
                </div>
              </FormGroup>

              {realmSettings.jiraEnabledForRealm && (
                <>
                  <Title headingLevel="h3" className="pf-v5-u-mt-lg">
                    {t("mpcPluginsTitle", { defaultValue: "Plugins" })}
                  </Title>
                  <FormGroup label={t("mpcJiraToggleLabel", { defaultValue: "Enable Control From Jira" })} fieldId="jira-controlled">
                  {settings.jiraControlled && (
                    <>
                      <FormGroup label={<>{t("mpcJiraIntegrationLabel", { defaultValue: "Jira Integration" })} <span className="pf-v5-u-danger-color-100">*</span></>} fieldId="jira-plugin">
                        <Select
                          aria-label="jira-plugin"
                          isOpen={jiraOpen}
                          onOpenChange={setJiraOpen}
                          toggle={(toggleRef) => (
                            <MenuToggle
                              ref={toggleRef}
                              isExpanded={jiraOpen}
                              onClick={() => setJiraOpen(!jiraOpen)}
                              isFullWidth
                            >
                                {settings.jiraPlugin
                                  ? (settings.jiraPlugin as PamPlugin).name
                                  : t("selectJiraIntegration")}
                            </MenuToggle>
                          )}
                        >
                          <SelectList style={{ maxHeight: 300, overflow: "auto", width: "100%" }}>
                            {pamPlugins.jira.map((p) => (
                              <SelectOption
                                key={p.id}
                                value={p.name}
                                selected={
                                  settings.jiraPlugin
                                    ? (settings.jiraPlugin as PamPlugin).id === p.id
                                    : false
                                }
                                onClick={() => {
                                  setSettings({ ...settings, jiraPlugin: p });
                                  setJiraOpen(false);
                                }}
                              />
                            ))}
                          </SelectList>
                        </Select>
                      </FormGroup>
                      {settings.jiraPlugin && (settings.jiraPlugin as PamPlugin).authHeader && (
                        <div className="pf-v5-u-color-200 pf-v5-u-mb-md">
                          {t("mpcJiraAuthHeaderIntro", { defaultValue: "For this integration, Jira Automation requests should be configured with" })}
                          <code className="pf-v5-u-ml-sm pf-v5-u-mr-sm">{(settings.jiraPlugin as PamPlugin).authHeader}</code>
                          {t("mpcJiraAuthHeaderSuffix", { defaultValue: "in the Authorization header." })}
                        </div>
                      )}
                      <FormGroup label={<><span className="pf-v5-u-text-nowrap">{t("mpcJiraBoardIdLabel", { defaultValue: "Jira Board Id" })}</span> <span className="pf-v5-u-danger-color-100">*</span></>} fieldId="jira-board-id">
                        <NumberInput
                          id="jira-board-id"
                          value={settings.jiraBoardId || 0}
                          min={1}
                          onMinus={() => setSettings({ ...settings, jiraBoardId: Math.max(1, (settings.jiraBoardId || 1) - 1) })}
                          onPlus={() => setSettings({ ...settings, jiraBoardId: (settings.jiraBoardId || 0) + 1 })}
                          onChange={(event: any) => setSettings({ ...settings, jiraBoardId: Number((event.currentTarget as HTMLInputElement).value) || 0 })}
                          style={{ width: "100%" }}
                        />
                      </FormGroup>
                    </>
                  )}
                </>
              )}

              <ActionGroup>
                <Button
                  variant="primary"
                  onClick={save}
                  isDisabled={!changed || !mpcSettingsAreValid(settings)}
                >
                  {t("mpcSaveButton", { defaultValue: "Save MPC Settings" })}
                </Button>
                <Button variant="link" onClick={reset} isDisabled={!changed}>
                  {t("cancel")}
                </Button>
              </ActionGroup>
            </>
          )}
        </>
      )}
      {!realmSettings.enabled && (
        <>
          <Title headingLevel="h2" className="pf-v5-u-mb-md">
            {t("mpcSettingsTitle", { defaultValue: "Multi-party Control (MPC) Settings" })}
          </Title>
          <div className="pf-v5-u-color-200">{t("mpcSettingsDisabled", { defaultValue: "MPC settings are disabled for this realm." })}</div>
        </>
      )}
      </Form>
    </div>
  );
}
