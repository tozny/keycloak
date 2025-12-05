import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import type PolicyRepresentation from "@keycloak/keycloak-admin-client/lib/defs/policyRepresentation";
import type ResourceRepresentation from "@keycloak/keycloak-admin-client/lib/defs/resourceRepresentation";
import {
  Button,
  Chip,
  ChipGroup,
  Form,
  FormGroup,
  PageSection,
  Stack,
  StackItem,
  Switch,
  AlertVariant,
} from "@patternfly/react-core";
import { HelpItem, useAlerts, useFetch } from "@keycloak/keycloak-ui-shared";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminClient } from "../admin-client";
import { useParams } from "../utils/useParams";
import type { ClientParams } from "./routes/Client";
import { UserSelect } from "../components/users/UserSelect";
import { GroupPickerDialog } from "../components/group/GroupPickerDialog";
import { FormProvider, useForm } from "react-hook-form";

export const AccessControl = () => {
  const { t } = useTranslation();
  const { addAlert, addError } = useAlerts();
  const { adminClient } = useAdminClient();
  const { clientId, tab } = useParams<ClientParams>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<GroupRepresentation[]>(
    [],
  );
  const [resource, setResource] = useState<ResourceRepresentation | undefined>();
  const [uPolicy, setUPolicy] = useState<PolicyRepresentation | undefined>();
  const [gPolicy, setGPolicy] = useState<PolicyRepresentation | undefined>();
  const [permission, setPermission] = useState<PolicyRepresentation | undefined>();
  const [dPolicy, setDPolicy] = useState<PolicyRepresentation | undefined>();
  const [isGroupPickerOpen, setGroupPickerOpen] = useState(false);

  const form = useForm<{ accessControlUsers: string[] }>({
    defaultValues: { accessControlUsers: [] },
  });
  const { setValue, getValues, reset } = form;

  const toggleGroupPicker = useCallback(
    () => setGroupPickerOpen((v) => !v),
    [],
  );

  const isDirty = useMemo(() => !loading, [loading]);

  // Internal constants mirroring AngularJS implementation
  const rsrcName = "__ToznyInternalAuthz";
  const permName = "__ToznyInternalAuthzMap";
  const gPolicyName = "__ToznyInternalGroupPolicy";
  const uPolicyName = "__ToznyInternalUserPolicy";
  const dPolicyName = "__ToznyInternalDenyPolicy";

  const findResourceByName = async (name: string) => {
    const list = await adminClient.clients.listResources({ id: clientId, name });
    return Array.isArray(list) ? list.find((r) => r.name === name) : undefined;
  };
  const findPolicyByName = async (name: string) => {
    const list = await adminClient.clients.listPolicies({ id: clientId, permission: "false", name });
    return Array.isArray(list)
      ? list.find((p: PolicyRepresentation) => p.name === name)
      : undefined;
  };
  const findPermissionByName = async (name: string) => {
    const list = await adminClient.clients.findPermissions({ id: clientId, name });
    return Array.isArray(list)
      ? list.find((p: PolicyRepresentation) => p.name === name)
      : undefined;
  };

  const createResource = async (): Promise<ResourceRepresentation> => {
    const payload: ResourceRepresentation = {
      name: rsrcName,
      displayName: rsrcName,
      ownerManagedAccess: false,
      attributes: {},
      uris: [],
    };
    const created = await adminClient.clients.createResource({ id: clientId }, payload);
    // API returns created resource; if not, fetch by name
    return created?._id ? created : (await findResourceByName(rsrcName))!;
  };

  const buildUserPolicy = (users: string[]): PolicyRepresentation => ({
    name: uPolicyName,
    type: "user",
    logic: "POSITIVE",
    decisionStrategy: "UNANIMOUS",
    users,
  } as unknown as PolicyRepresentation);

  const buildGroupPolicy = (groups: { id: string; extendChildren?: boolean }[]): PolicyRepresentation => ({
    name: gPolicyName,
    type: "group",
    logic: "POSITIVE",
    decisionStrategy: "UNANIMOUS",
    groups,
  } as unknown as PolicyRepresentation);

  const buildDenyPolicy = (): PolicyRepresentation => ({
    name: dPolicyName,
    type: "static" as any,
    logic: "POSITIVE",
    decisionStrategy: "UNANIMOUS",
    // Keycloak stores extra fields under config for some policy types; allowOrDeny is used by static policy
    allowOrDeny: "deny" as any,
    config: { allowOrDeny: "deny" } as any,
  } as unknown as PolicyRepresentation);

  const saveOrUpdatePolicy = async (
    existing: PolicyRepresentation | undefined,
    payload: PolicyRepresentation | undefined,
  ): Promise<PolicyRepresentation | undefined> => {
    if (!payload) {
      if (existing?.id) {
        await adminClient.clients.delPolicy({ id: clientId, policyId: existing.id });
      }
      return undefined;
    }
    if (!existing) {
      return await adminClient.clients.createPolicy({ id: clientId, type: payload.type! }, payload);
    }
    await adminClient.clients.updatePolicy({ id: clientId, type: existing.type!, policyId: existing.id! }, payload);
    // Some servers may return void; avoid re-fetch and synthesize the updated object
    return { ...existing, ...payload } as PolicyRepresentation;
  };

  const createOrUpdatePermission = async (
    res: ResourceRepresentation,
    policies: string[],
    existing?: PolicyRepresentation,
  ): Promise<PolicyRepresentation> => {
    const common = {
      name: permName,
      type: "resource",
      logic: "POSITIVE" as const,
      decisionStrategy: "AFFIRMATIVE" as const,
      resources: [res._id!],
      policies,
    };
    if (!existing) {
      return await adminClient.clients.createPermission({ id: clientId, type: "resource" }, common as unknown as PolicyRepresentation);
    }
    await adminClient.clients.updatePermission(
      { id: clientId, type: "resource", permissionId: existing.id! },
      common as unknown as PolicyRepresentation,
    );
    return (await adminClient.clients.findOnePermission({ id: clientId, type: "resource", permissionId: existing.id! })) as PolicyRepresentation;
  };

  useFetch(
    async () => {
      // Discover existing UMA artifacts by fixed names
      const [res, perm, up, gp, dp] = await Promise.all([
        findResourceByName(rsrcName),
        findPermissionByName(permName),
        findPolicyByName(uPolicyName),
        findPolicyByName(gPolicyName),
        findPolicyByName(dPolicyName),
      ]);

      let selectedUserIds: string[] = [];
      let selectedGroups: GroupRepresentation[] = [];
      if (up) {
        // @ts-ignore users property present for user policies
        selectedUserIds = (up.users as string[]) || [];
      }
      if (gp) {
        // groups are stored as array of {id, extendChildren}
        const groupEntries = (gp as any).groups || [];
        const groups = await Promise.all(
          groupEntries.map((g: { id: string }) => adminClient.groups.findOne({ id: g.id })),
        );
        selectedGroups = groups.filter(Boolean) as GroupRepresentation[];
      }

      return {
        res,
        perm,
        up,
        gp,
        dp,
        enabled: !res && !perm && !dp ? true : !!(res && perm && dp),
        users: selectedUserIds,
        groups: selectedGroups,
      };
    },
    ({ res, perm, up, gp, dp, enabled, users, groups }) => {
      setResource(res);
      setPermission(perm);
      setUPolicy(up as PolicyRepresentation | undefined);
      setGPolicy(gp as PolicyRepresentation | undefined);
      setDPolicy(dp as PolicyRepresentation | undefined);
      setEnabled(enabled);
      // Populate form with fetched users so UserSelect can render chips
      reset({ accessControlUsers: users });
      setGroupIds(groups.map((g) => g.id!));
      setSelectedGroups(groups);
      setLoading(false);
    },
    [clientId, tab],
  );

  const onSave = async () => {
    setSaving(true);
    try {
      // ensure resource & permission exist when enabled
      let res = resource;
      if (enabled && !res) {
        res = await createResource();
        setResource(res);
      }

      // Prepare desired policies from UI state
      const desiredUserIds = getValues("accessControlUsers");
      const desiredGroupEntries = groupIds.map((id) => ({ id, extendChildren: false }));

      // Determine next policy payloads
      const nextUPolicy = desiredUserIds.length > 0 ? buildUserPolicy(desiredUserIds) : undefined;
      const nextGPolicy = desiredGroupEntries.length > 0 ? buildGroupPolicy(desiredGroupEntries) : undefined;
      const nextDPolicy = enabled ? buildDenyPolicy() : undefined;

      // Short-circuit: if disabled, delete all UMA artifacts
      if (!enabled) {
        if (permission?.id) {
          await adminClient.clients.delPermission({ id: clientId, type: "resource", permissionId: permission.id });
          setPermission(undefined);
        }
        if (uPolicy?.id) {
          await adminClient.clients.delPolicy({ id: clientId, policyId: uPolicy.id });
          setUPolicy(undefined);
        }
        if (gPolicy?.id) {
          await adminClient.clients.delPolicy({ id: clientId, policyId: gPolicy.id });
          setGPolicy(undefined);
        }
        if (dPolicy?.id) {
          await adminClient.clients.delPolicy({ id: clientId, policyId: dPolicy.id });
          setDPolicy(undefined);
        }
        if (resource?._id) {
          await adminClient.clients.delResource({ id: clientId, resourceId: resource._id });
          setResource(undefined);
        }
        addAlert(t("save"), AlertVariant.success);
        return;
      }

      // Save/update policies
      const savedDPolicy = await saveOrUpdatePolicy(dPolicy, nextDPolicy);
      const savedUPolicy = await saveOrUpdatePolicy(uPolicy, nextUPolicy);
      const savedGPolicy = await saveOrUpdatePolicy(gPolicy, nextGPolicy);
      setDPolicy(savedDPolicy);
      setUPolicy(savedUPolicy);
      setGPolicy(savedGPolicy);

      // Update permission mapping with present policies
      const policyIds = [savedDPolicy?.id, savedUPolicy?.id, savedGPolicy?.id].filter(Boolean) as string[];
      if (!res) throw new Error("Resource missing after creation");
      const updatedPerm = await createOrUpdatePermission(res, policyIds, permission);
      setPermission(updatedPerm);

      addAlert(t("save"), AlertVariant.success);
    } catch (error) {
      addError("save", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageSection variant="light">
      <Form isHorizontal>
        <Stack hasGutter>
          <StackItem>
            <FormGroup
              label={t("accessControlEnabled")}
              fieldId="access-control-enabled"
              labelIcon={ 
                          <HelpItem helpText={t("accessControlEnabledHelp")} fieldLabelId="access-control-enabled"/>
                        }
            >
              <Switch
                id="access-control-enabled"
                label={t("enabled")}
                labelOff={t("disabled")}
                isChecked={enabled}
                onChange={(_, checked) => setEnabled(checked)}
                isDisabled={loading}
              />
            </FormGroup>
          </StackItem>

          <StackItem>
            {!loading && (
              <FormProvider {...form}>
                <UserSelect
                  name="accessControlUsers"
                  label="allowedUsers"
                  helpText="allowedUsersHelp"
                  defaultValue={[]}
                />
              </FormProvider>
            )}
          </StackItem>

          <StackItem>
            <FormGroup label={t("allowedGroups")} 
              fieldId="allowed-groups"
              labelIcon={ 
                          <HelpItem helpText={t("allowedGroupsHelp")} fieldLabelId="allowed-groups"/>
                        }
            >
              {!!selectedGroups.length && (
                <ChipGroup aria-label="Selected groups">
                  {selectedGroups.map((g) => (
                    <Chip
                      key={g.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelectedGroups((prev) => prev.filter((sg) => sg.id !== g.id));
                        setGroupIds((prev) => prev.filter((id) => id !== g.id));
                      }}
                    >
                      {g.name}
                    </Chip>
                  ))}
                </ChipGroup>
              )}
              {isGroupPickerOpen && (
                <GroupPickerDialog
                  type="selectMany"
                  text={{ title: "addGroups", ok: "add" }}
                  onConfirm={(groups) => {
                    const newGroups = groups || [];
                    setSelectedGroups((prev) => [...prev, ...newGroups]);
                    setGroupIds((prev) => [
                      ...prev,
                      ...newGroups
                        .map((g) => g.id!)
                        .filter((id) => !prev.includes(id)),
                    ]);
                    setGroupPickerOpen(false);
                  }}
                  onClose={toggleGroupPicker}
                  filterGroups={selectedGroups}
                />
              )}
              <Button variant="secondary" onClick={toggleGroupPicker}>
                {t("addGroups")}
              </Button>
            </FormGroup>
          </StackItem>

          <StackItem>
            <Button
              variant="primary"
              isDisabled={loading || saving || !isDirty}
              onClick={onSave}
            >
              {t("save")}
            </Button>
          </StackItem>
        </Stack>
      </Form>
    </PageSection>
  );
};
