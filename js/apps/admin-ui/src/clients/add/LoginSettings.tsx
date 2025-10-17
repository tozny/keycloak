import { FormGroup } from "@patternfly/react-core";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { HelpItem, TextControl } from "@keycloak/keycloak-ui-shared";

import { MultiLineInput } from "../../components/multi-line-input/MultiLineInput";
import { convertAttributeNameToForm } from "../../util";
import { FormFields } from "../ClientDetails";

import { FormFieldWithHint } from '../../components/form/FormFieldWithHint';


type LoginSettingsProps = {
  protocol?: string;
  selectedClientTemplate?: string;
};

const getThirdPartyInstructions = (template?: string) => {
  if (!template) return { helpText: "", link: "", linkText: "" };

  const instructionsMap: Record<string, { helpText: string; link: string; linkText: string }> = {
    "Google SAML": {
      helpText: "gSuiteThirdPartyInstructionsHelp",
      link: "gSuiteThirdPartyInstructionsLink",
      linkText: "gSuiteThirdPartyInstructionsLinkText",
    },
    "Slack SAML": {
      helpText: "slackThirdPartyInstructionsHelp",
      link: "slackThirdPartyInstructionsLink",
      linkText: "slackThirdPartyInstructionsLinkText",
    },
    "Jira (Atlassian) SAML": {
      helpText: "atlassianThirdPartyInstructionsHelp",
      link: "atlassianThirdPartyInstructionsLink",
      linkText: "atlassianThirdPartyInstructionsLinkText",
    },
    "Freshdesk OpenID-Connect": {
      helpText: "freshdeskThirdPartyInstructionsHelp",
      link: "freshdeskThirdPartyInstructionsLink",
      linkText: "freshdeskThirdPartyInstructionsLinkText",
    },
    "Dropbox SAML": {
      helpText: "dropboxThirdPartyInstructionsHelp",
      link: "dropboxThirdPartyInstructionsLink",
      linkText: "dropboxThirdPartyInstructionsLinkText",
    },
    "Office 365 SAML": {
      helpText: "office365ThirdPartyInstructionsHelp",
      link: "office365ThirdPartyInstructionsLink",
      linkText: "office365ThirdPartyInstructionsLinkText",
    },
  };

  const instructions = instructionsMap[template] || { helpText: "", link: "", linkText: "" };
  
  // Clean up the URL by removing any surrounding quotes
  if (instructions.link) {
    instructions.link = instructions.link.replace(/^"|"$/g, '');
  }

  return instructions;
};

const getBaseUrlInstructions = (template?: string) => {
  if (!template) return { baseUrlhelpText: "" };

  const instructionsMap: Record<string, { baseUrlhelpText: string}> = {
    "Freshdesk OpenID-Connect": {
      baseUrlhelpText: "freshdeskBaseUrlHelp"
    },
    "Dropbox SAML": {
      baseUrlhelpText: "dropboxBaseUrlHelp"
    }
  };

  return instructionsMap[template] || { helpText: ""};
};

export const LoginSettings = ({
  protocol = "openid-connect",
  selectedClientTemplate
}: LoginSettingsProps) => {
  const { t } = useTranslation();
  const { watch } = useFormContext<FormFields>();

  const standardFlowEnabled = watch("standardFlowEnabled");
  const implicitFlowEnabled = watch("implicitFlowEnabled");
  const { helpText, link, linkText } = getThirdPartyInstructions(selectedClientTemplate);
  const { baseUrlhelpText } = getBaseUrlInstructions(selectedClientTemplate);

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
          labelIcon={t(baseUrlhelpText)}
          rules={{ required: t("required") }}
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
        <FormFieldWithHint
          name="gSuiteDomain"
          label="gSuiteDomain"
          helpText="gSuiteDomainHelp"
          hintText="gSuiteDomainHint"
          required
        />
      )}

      {showSlackDomain && (
        <FormFieldWithHint
          name="slackDomain"
          label="slackDomain"
          helpText="slackDomainHelp"
          hintText="slackDomainHint"
          required
        />
      )}

      {showJiraUrl && (
        <FormFieldWithHint
          name="jiraUrl"
          type="url"
          label="atlassianId"
          helpText="atlassianIdHelp"
          hintText="atlassianIdHint"
          required
        />
      )}

      {showFreshdeskRedirectUrl && (
        <TextControl
          type="url"
          name="freshdeskRedirectUrl"
          label={t("freshdeskRedirectUrl")}
          labelIcon={t("freshdeskRedirectUrlHelp")}
          rules={{ required: t("required") }}
        />
      )}

      {showThirdPartyInstructions && (
        <FormGroup
          label={t("thirdPartyInstructions")}
          fieldId="third-party-instructions"
          labelIcon={
            <HelpItem
              helpText={t(helpText)}
              fieldLabelId="third-party-instructions"
            />
          }
        >
          <div className="pf-c-form-control" style={{ padding: '0.375rem 0.5rem' }}>
            <a
              href={t(link).replace(/^"|"$/g, '')}
              target="_blank"
              rel="noopener noreferrer"
              className="pf-c-button pf-m-link pf-m-inline"
            >
              {t(linkText)}
            </a>
          </div>
        </FormGroup>
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
