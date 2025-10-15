import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { TextControl, TextAreaControl } from "@keycloak/keycloak-ui-shared";

import { FormAccess } from "../components/form/FormAccess";
import { DefaultSwitchControl } from "../components/SwitchControl";

type ClientDescriptionProps = {
  protocol?: string;
  hasConfigureAccess?: boolean;
  selectedTemplate?: string;
};

// Templates that should show client ID, name, and description
const SHOW_CLIENT_FIELDS_TEMPLATES = [
  "Custom OpenID-Connect",
  "Custom SAML",
  "Freshdesk OpenID-Connect"
];

export const ClientDescription = ({
  hasConfigureAccess: configure,
  selectedTemplate,
}: ClientDescriptionProps) => {
  const { t } = useTranslation();
  const { control } = useFormContext();

  // Define which templates should show the client ID, name, and description
  const showClientFields = selectedTemplate 
    ? SHOW_CLIENT_FIELDS_TEMPLATES.includes(selectedTemplate)
    : false;

  // Don't render anything if the template doesn't require these fields
  // if (!showClientFields) {
  //   return null; 
  // }
  return (
    <FormAccess role="manage-clients" fineGrainedAccess={configure} unWrap>
      {showClientFields && (<TextControl
        control={control}
        name="clientId"
        label={t("clientId")}
        labelIcon={t("clientIdHelp")}
        rules={{ required: t("required") }}
        />)}
      
      {showClientFields && (<TextControl
        control={control}
        name="name"
        label={t("name")}
        labelIcon={t("clientNameHelp")}
      />)}
      
      {showClientFields && (<TextAreaControl
        control={control}
        name="description"
        label={t("description")}
        labelIcon={t("clientDescriptionHelp")}
        rules={{
          maxLength: {
            value: 255,
            message: t("maxLength", { length: 255 }),
          },
        }}
      />)}
      
      <DefaultSwitchControl
        control={control}
        name="alwaysDisplayInConsole"
        label={t("alwaysDisplayInUI")}
        labelIcon={t("alwaysDisplayInUIHelp")}
      />
    </FormAccess>
  );
};
