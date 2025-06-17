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
    "totp-device": string;
    "totp-code": string;
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
        "totp-device": "totp",
        "totp-code": "",
      },
    });


    const { t } = useTranslation();

    const onSubmit = async (data: TotpFormData) => {
      console.log("IN HERE")
      let accessToken = await adminClient.getAccessToken();
      console.log("Got Token")
      await tozMfa.RegisterTotp(totp, data["totp-code"], data["totp-device"], accessToken!);
    };

    return (
        <Form onSubmit={handleSubmit(onSubmit)}>
            <TextControl
              name="totp-device"
              control={control}
              label={t("totpDeviceName")}
              rules={{ required: t("required") }}
              defaultValue="totp"
            />

            <TextControl
              name="totp-code"
              control={control}
              label={t("totpCode")}
              rules={{ required: t("required") }}
            />

            <ActionGroup>
              <Button
                id="reset-submit"
                data-testid="submit"
                key="submit"
                type="submit"
                variant={ButtonVariant.primary}
              >
                {t("submit")}
              </Button>
            </ActionGroup>
        </Form>
    );
  };

  export default TotpForm;
