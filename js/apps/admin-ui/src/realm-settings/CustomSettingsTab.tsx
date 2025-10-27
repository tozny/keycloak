import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation";
import { TextControl } from "@keycloak/keycloak-ui-shared";
import { PageSection } from "@patternfly/react-core";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FixedButtonsGroup } from "../components/form/FixedButtonGroup";
import { FormAccess } from "../components/form/FormAccess";
import { useAdminClient } from "../admin-client";
import { getTozSettings, saveTozSettings, TozSettings } from "../utils/TozSettings";

export type UICustomSettingsRealm = RealmRepresentation;

export type CustomSettingsTabProps = {
  realm: UICustomSettingsRealm;
  save: (realm: UICustomSettingsRealm) => Promise<void>;
};

export const CustomSettingsTab = ({ realm: _realm, save: _save }: CustomSettingsTabProps) => {
  const { t } = useTranslation();
  const { adminClient } = useAdminClient();
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
    await saveTozSettings(adminClient, data);
  });

  return (
    <PageSection variant="light">
      <FormProvider {...form}>
        <FormAccess isHorizontal role="manage-realm" className="pf-u-mt-lg" onSubmit={onSubmit}>
          <TextControl
            name="forgot_password_custom_link"
            label={t("customPasswordLink")}
          />
          <TextControl
            name="forgot_password_custom_text"
            label={t("customTextLink")}
          />
          <FixedButtonsGroup name="customSettingsTab" reset={setupForm} isSubmit />
        </FormAccess>
      </FormProvider>
    </PageSection>
  );
};
