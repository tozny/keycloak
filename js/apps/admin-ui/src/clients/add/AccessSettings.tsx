import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { TextControl } from "@keycloak/keycloak-ui-shared";

import { FixedButtonsGroup } from "../../components/form/FixedButtonGroup";
import { FormAccess } from "../../components/form/FormAccess";
import { useAccess } from "../../context/access/Access";
import { FormFields } from "../ClientDetails";
import type { ClientSettingsProps } from "../ClientSettings";
import { LoginSettings } from "./LoginSettings";
import { DefaultSwitchControl } from "../../components/SwitchControl";
import { convertAttributeNameToForm } from "../../util";

export const AccessSettings = ({
  client,
  save,
  reset,
}: ClientSettingsProps) => {
  const { t } = useTranslation();
  const { watch } = useFormContext<FormFields>();

  const { hasAccess } = useAccess();
  const isManager = hasAccess("manage-clients") || client.access?.configure;

  const protocol = watch("protocol");

  return (
    <FormAccess
      isHorizontal
      fineGrainedAccess={client.access?.configure}
      role="manage-clients"
    >
      {!client.bearerOnly && <LoginSettings protocol={protocol} />}
      {protocol !== "saml" && (
        <DefaultSwitchControl
          name={convertAttributeNameToForm<FormFields>(
            "attributes.api.access",
          )}
          defaultValue="false"
          label={t("allowApiAccessUI")}
          labelIcon={t("allowApiAccessHelp")}
          stringify
        />
      )}
      {protocol !== "saml" && (
        <TextControl
          type="url"
          name="adminUrl"
          label={t("adminURL")}
          labelIcon={t("adminURLHelp")}
        />
      )}
      {client.bearerOnly && (
        <FixedButtonsGroup
          name="settings"
          save={save}
          reset={reset}
          isDisabled={isManager}
        />
      )}
    </FormAccess>
  );
};
