import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import {
  Button,
  Form,
  FormGroup,
  PageSection,
  Stack,
  StackItem,
  Switch,
  AlertVariant,
} from "@patternfly/react-core";
import { useAlerts, useFetch } from "@keycloak/keycloak-ui-shared";
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
  const { clientId } = useParams<ClientParams>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<GroupRepresentation[]>(
    [],
  );
  const [isGroupPickerOpen, setGroupPickerOpen] = useState(false);

  const form = useForm<{ accessControlUsers: string[] }>({
    defaultValues: { accessControlUsers: [] },
  });
  const { setValue, getValues } = form;

  const toggleGroupPicker = useCallback(
    () => setGroupPickerOpen((v) => !v),
    [],
  );

  const isDirty = useMemo(() => !loading, [loading]);

  useFetch(
    async () => {
      const client = await adminClient.clients.findOne({ id: clientId });
      if (!client) throw new Error("notFound");
      const attrs = client.attributes || {};
      const enabledAttr = (
        attrs["accessControlEnabled"] as unknown as string[]
      )?.[0];
      const userAttr =
        (attrs["accessControlUserIds"] as unknown as string[]) || [];
      const groupAttr =
        (attrs["accessControlGroupIds"] as unknown as string[]) || [];

      const gidList = Array.isArray(groupAttr) ? groupAttr : [];
      const groups = await Promise.all(
        gidList.filter(Boolean).map((id) => adminClient.groups.findOne({ id })),
      );
      return {
        enabled: enabledAttr === "true",
        users: Array.isArray(userAttr) ? userAttr : [],
        groups: groups.filter(Boolean) as GroupRepresentation[],
      };
    },
    ({ enabled, users, groups }) => {
      setEnabled(enabled);
      setValue("accessControlUsers", users, { shouldDirty: false });
      setGroupIds(groups.map((g) => g.id!));
      setSelectedGroups(groups);
      setLoading(false);
    },
    [],
  );

  const onSave = async () => {
    setSaving(true);
    try {
      const existing = await adminClient.clients.findOne({ id: clientId });
      if (!existing) throw new Error("notFound");
      const attributes = { ...(existing.attributes || {}) } as Record<
        string,
        unknown
      >;
      attributes["accessControlEnabled"] = [enabled ? "true" : "false"];
      attributes["accessControlUserIds"] = getValues("accessControlUsers");
      attributes["accessControlGroupIds"] = groupIds;

      await adminClient.clients.update(
        { id: clientId },
        {
          ...existing,
          attributes: attributes as Record<string, string[]>,
        },
      );

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
            <FormProvider {...form}>
              <UserSelect
                name="accessControlUsers"
                label="allowedUsers"
                helpText="allowedUsersHelp"
                defaultValue={[]}
              />
            </FormProvider>
          </StackItem>

          <StackItem>
            <FormGroup label={t("allowedGroups")} fieldId="allowed-groups">
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
