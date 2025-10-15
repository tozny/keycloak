import { FormGroup } from "@patternfly/react-core";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HelpItem, TextControl } from "@keycloak/keycloak-ui-shared";

import { MultiLineInput } from "../../components/multi-line-input/MultiLineInput";
import { convertAttributeNameToForm } from "../../util";
import { FormFields } from "../ClientDetails";

type LoginSettingsProps = {
  protocol?: string;
  selectedClientTemplate?: string;
};

export const LoginSettings = ({
  protocol = "openid-connect",
  selectedClientTemplate
}: LoginSettingsProps) => {
  const { t } = useTranslation();
  const { watch } = useFormContext<FormFields>();

  const standardFlowEnabled = watch("standardFlowEnabled");
  const implicitFlowEnabled = watch("implicitFlowEnabled");

  const showRootUrl = protocol === "openid-connect" && selectedClientTemplate === "Custom OpenID-Connect";
  const showBaseUrl = protocol === "openid-connect" || protocol === "saml" 
  && (selectedClientTemplate === "Freshdesk OpenID-Connect" || selectedClientTemplate === "Dropbox SAML");
  const showSamlEndpoint = protocol === "saml" && selectedClientTemplate === "Custom SAML";
  const showGSuiteDomain = protocol === "saml" && selectedClientTemplate === "Google SAML";
  const showSlackDomain = protocol === "saml" && selectedClientTemplate === "Slack SAML";
  const showJiraUrl = protocol === "saml" && selectedClientTemplate === "Jira (Atlassian) SAML";
  const showFreshdeskRedirectUrl = protocol === "openid-connect" && selectedClientTemplate === "Freshdesk OpenID-Connect";
  const showThirdPartyInstructions = (protocol === 'saml' || protocol === 'openid-connect') && (selectedClientTemplate === "Google SAML" || selectedClientTemplate === "Slack SAML" 
  || selectedClientTemplate === "Jira (Atlassian) SAML" || selectedClientTemplate === "Freshdesk OpenID-Connect" || selectedClientTemplate === "Dropbox SAML" || selectedClientTemplate === "Office 365 SAML");

  return (
    <>
      {showRootUrl && (
        <TextControl
          type="url"
          name="rootUrl"
          label={t("rootUrl")}
          labelIcon={t("rootURLHelp")}
        />
      )}
      {showBaseUrl && (
        <TextControl
          type="url"
          name="baseUrl"
          label={t("baseUrl")}
          labelIcon={t("baseUrlHelp")}
        />
      )}

      {showSamlEndpoint && (
        <TextControl
          type="url"
          name="customSamlEndpoint"
          label={t("customSamlEndpoint")}
          labelIcon={t("customSamlEndpointHelp")}
        />
      )}

      {showGSuiteDomain && (
        <TextControl
          name="gSuiteDomain"
          label={t("gSuiteDomain")}
          labelIcon={t("gSuiteDomainHelp")}
        />
      )}

      {showSlackDomain && (
        <TextControl
          name="slackDomain"
          label={t("slackDomain")}
          labelIcon={t("slackDomainHelp")}
        />
      )}

      {showJiraUrl && (
        <TextControl
          type="url"
          name="jiraUrl"
          label={t("jiraUrl")}
          labelIcon={t("jiraUrlHelp")}
        />
      )}

      {showFreshdeskRedirectUrl && (
        <TextControl
          type="url"
          name="freshdeskRedirectUri"
          label={t("freshdeskRedirectUri")}
          labelIcon={t("freshdeskRedirectUriHelp")}
        />
      )}

      {showThirdPartyInstructions && (
        <TextControl
          name="thirdPartyInstructions"
          label={t("thirdPartyInstructions")}
          labelIcon={t("thirdPartyInstructionsHelp")}
        />
      )}

      {(standardFlowEnabled || implicitFlowEnabled) && (
        <>
          <FormGroup
            label={t("validRedirectUri")}
            fieldId="kc-redirect"
            labelIcon={
              <HelpItem
                helpText={t("validRedirectURIsHelp")}
                fieldLabelId="validRedirectUri"
              />
            }
          >
            <MultiLineInput
              id="kc-redirect"
              name="redirectUris"
              aria-label={t("validRedirectUri")}
              addButtonLabel="addRedirectUri"
            />
          </FormGroup>
          <FormGroup
            label={t("validPostLogoutRedirectUri")}
            fieldId="kc-postLogoutRedirect"
            labelIcon={
              <HelpItem
                helpText={t("validPostLogoutRedirectURIsHelp")}
                fieldLabelId="validPostLogoutRedirectUri"
              />
            }
          >
            <MultiLineInput
              id="kc-postLogoutRedirect"
              name={convertAttributeNameToForm(
                "attributes.post.logout.redirect.uris",
              )}
              aria-label={t("validPostLogoutRedirectUri")}
              addButtonLabel="addPostLogoutRedirectUri"
              stringify
            />
          </FormGroup>
        </>
      )}
      {protocol === "saml" && (
        <>
          <TextControl
            name="attributes.saml_idp_initiated_sso_url_name"
            label={t("idpInitiatedSsoUrlName")}
            labelIcon={t("idpInitiatedSsoUrlNameHelp")}
          />
          <TextControl
            name="attributes.saml_idp_initiated_sso_relay_state"
            label={t("idpInitiatedSsoRelayState")}
            labelIcon={t("idpInitiatedSsoRelayStateHelp")}
          />
          <TextControl
            type="url"
            name="adminUrl"
            label={t("masterSamlProcessingUrl")}
            labelIcon={t("masterSamlProcessingUrlHelp")}
          />
        </>
      )}
      {protocol !== "saml" && standardFlowEnabled && (
        <FormGroup
          label={t("webOrigins")}
          fieldId="kc-web-origins"
          labelIcon={
            <HelpItem
              helpText={t("webOriginsHelp")}
              fieldLabelId="webOrigins"
            />
          }
        >
          <MultiLineInput
            id="kc-web-origins"
            name="webOrigins"
            aria-label={t("webOrigins")}
            addButtonLabel="addWebOrigins"
          />
        </FormGroup>
      )}
    </>
  );
};
