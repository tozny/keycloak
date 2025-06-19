import React from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  ActionGroup,
  Button,
  ButtonVariant,
  AlertVariant,
} from "@patternfly/react-core";
import { TextControl } from "@keycloak/keycloak-ui-shared";
import { useTranslation } from "react-i18next";
import { TozMFA } from "../utils/TozMfa";
import KeycloakAdminClient, { NetworkError } from "libs/keycloak-admin-client/lib";
import { useAlerts } from "@keycloak/keycloak-ui-shared";

type TotpFormData = {
    "totpDevice": string;
    "totpCode": string;
  };

  type TotpFormProps = {
    totp: any; // use a specific type if available
    tozMfa: TozMFA
    adminClient : KeycloakAdminClient
    onSuccess: (value: boolean) => void
  };

  const TotpForm: React.FC<TotpFormProps> = ({ totp, tozMfa, adminClient, onSuccess }) => {
    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm<TotpFormData>({
      defaultValues: {
        "totpDevice": "totp",
        "totpCode": "",
      },
    });


    const { t } = useTranslation();
    const { addAlert, addError } = useAlerts();

    const onSubmit = async (data: TotpFormData) => {
      try{
        let accessToken = await adminClient.getAccessToken();
        let totpCode = data["totpCode"]
        let totpDevice = data["totpDevice"]
        await tozMfa.RegisterTotp(totp, totpCode, totpDevice, accessToken!);
        onSuccess(true)
        addAlert(`Successfully registered credential ${totpDevice}`, AlertVariant.success);
      } catch (err){
        if (err instanceof NetworkError){
          addError(`Unable to register credential: ${err.message}`, AlertVariant.danger);
        } else if (err instanceof Error){
          addError(`Something went wrong: ${err.message}`, AlertVariant.danger);
        }
      }

    };

    return (
        <Form onSubmit={handleSubmit(onSubmit)}>
            <TextControl
              name="totpDevice"
              control={control}
              label={t("totpDeviceName")}
              rules={{ required: t("required") }}
              defaultValue="totp"
            />

            <TextControl
              name="totpCode"
              control={control}
              label={t("totpCode")}
              rules={{ required: t("required") }}
            />

              <Button
                id="reset-submit"
                data-testid="submit"
                key="submit"
                type="submit"
                variant={ButtonVariant.primary}
              >
                {t("submit")}
              </Button>
        </Form>
    );
  };

  export default TotpForm;
