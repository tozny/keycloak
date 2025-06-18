import React from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  ActionGroup,
  Button,
  ButtonVariant,
} from "@patternfly/react-core";
import { TextControl } from "@keycloak/keycloak-ui-shared";
import { useTranslation } from "react-i18next";
import { TozMFA } from "../utils/TozMfa";
import KeycloakAdminClient from "libs/keycloak-admin-client/lib";

type TotpFormData = {
    "totpDevice": string;
    "totpCode": string;
  };

  type TotpFormProps = {
    totp: any; // use a specific type if available
    tozMfa: TozMFA
    adminClient : KeycloakAdminClient
  };

  const TotpForm: React.FC<TotpFormProps> = ({ totp, tozMfa, adminClient }) => {
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

    const onSubmit = async (data: TotpFormData) => {
      try{
        console.log("IN HERE")
        let accessToken = await adminClient.getAccessToken();
        console.log("Got Token")
        console.log("totp code from form: " + data["totpCode"])
        await tozMfa.RegisterTotp(totp, data["totpCode"], data["totpDevice"], accessToken!);
      } catch (err){
        console.error(err)
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
