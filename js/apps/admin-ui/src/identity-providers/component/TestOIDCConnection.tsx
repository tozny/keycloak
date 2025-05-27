import { Button, ClipboardCopy, FormGroup } from "@patternfly/react-core";
import { useFormContext } from "react-hook-form";
import { HelpItem, useAlerts, useEnvironment } from "@keycloak/keycloak-ui-shared";
import { useRealm } from "../../context/realm-context/RealmContext";
import { addTrailingSlash } from "../../util";
import { useTranslation } from "react-i18next";

type IdentityProviderConfig = {
  authorizationUrl?: string;
  clientId?: string;
  defaultScope?: string;
};
//TODO: Add translations for all UI messages
export const TestOIDCConnection  = () => {

  const { getValues } = useFormContext<{ config: IdentityProviderConfig }>();
  const { addAlert, addError } = useAlerts();
  const { realm } = useRealm();
  const { environment } = useEnvironment();
  const { t } = useTranslation();
  const testConnectionUrl = `${addTrailingSlash(
      environment.serverBaseUrl,
    )}realms/${realm}/test-idp-connection`;


  const testIdpConnection = () => {
    const config = getValues("config") || {};
    let scope = config.defaultScope || "openid";
    //TODO: Update error message to use localization
    if (!config.authorizationUrl) {
      addError("missingTestConnectionParameter", {message: "Please set the Authorization Url"});
      return;
    }

    if (!config.clientId) {
      addError("missingTestConnectionParameter", {message: "Please set a Client ID"});
      return;
    }

    try {
      const url = new URL(config.authorizationUrl);

      url.searchParams.append("scope", scope);
      url.searchParams.append("response_type", "code");
      url.searchParams.append("client_id", config.clientId);
      url.searchParams.append("redirect_uri", testConnectionUrl);
      url.searchParams.append("state", Math.random().toString(36).substring(2, 15));

      window.open(url.toString(), "_blank");
    } catch (e) {
      addError("invalidTestConnectionParameter", {message: "Invalid Authorization URL"});
    }
  };


  return (
    <FormGroup
      label={t("testConnectionRedirectURI")}
      labelIcon={
        <HelpItem helpText={t("testConnectionRedirectURIHelp")} fieldLabelId="testConnectionRedirectURI" />
      }
      fieldId="kc-redirect-uri"
    >
      <ClipboardCopy
        isReadOnly
      >{testConnectionUrl}</ClipboardCopy>
      <Button
        variant="primary"
        data-testid="test-connection"
        onClick={testIdpConnection}
      >
        {t("testConnectionButton")}
      </Button>
    </FormGroup>
  );
}
