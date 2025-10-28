import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation";
import { TextControl } from "@keycloak/keycloak-ui-shared";
import { PageSection, AlertVariant } from "@patternfly/react-core";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FixedButtonsGroup } from "../components/form/FixedButtonGroup";
import { FormAccess } from "../components/form/FormAccess";
import { useAdminClient } from "../admin-client";
import { useAlerts } from "@keycloak/keycloak-ui-shared";
import { getTozSettings, saveTozSettings, TozSettings } from "../utils/TozSettings";

export type UICustomSettingsRealm = RealmRepresentation;

export type CustomSettingsTabProps = {
  realm: UICustomSettingsRealm;
  save: (realm: UICustomSettingsRealm) => Promise<void>;
};

export const CustomSettingsTab = ({ realm: _realm, save: _save }: CustomSettingsTabProps) => {
  const { t } = useTranslation();
  const { adminClient } = useAdminClient();
  const { addAlert, addError } = useAlerts();
  const form = useForm<TozSettings>({
    defaultValues: {
      forgot_password_custom_link: "",
      forgot_password_custom_text: "",
    },
  });
  const { setValue, handleSubmit } = form;

  const setupForm = async () => {
    const settings = await getTozSettings(adminClient);
    setValue("forgot_password_custom_link", settings.forgot_password_custom_link ?? "");
    setValue("forgot_password_custom_text", settings.forgot_password_custom_text ?? "");
  };

  useEffect(() => {
    void setupForm();
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await saveTozSettings(adminClient, data);
      addAlert(t("realmSaveSuccess"), AlertVariant.success);
    } catch (error) {
      addError("realmSaveError", error as Error);
    }
  });

  return (
    <PageSection variant="light">
      <FormProvider {...form}>
        <FormAccess isHorizontal role="manage-realm" className="pf-u-mt-lg" onSubmit={onSubmit}>
          <TextControl
            name="forgot_password_custom_link"
            label={t("forgotPasswordCustomLink")}
            labelIcon={t("forgotPasswordCustomLinkHelp")}
          />
          <TextControl
            name="forgot_password_custom_text"
            label={t("forgotPasswordCustomText")}
            labelIcon={t("forgotPasswordCustomTextHelp")}
          />
          <FixedButtonsGroup name="customSettingsTab" reset={setupForm} isSubmit />
        </FormAccess>
      </FormProvider>
    </PageSection>
  );
};
