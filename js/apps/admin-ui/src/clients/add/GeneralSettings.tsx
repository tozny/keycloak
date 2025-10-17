import { useTranslation } from "react-i18next";
import { HelpItem, SelectControl } from "@keycloak/keycloak-ui-shared";
import { FormAccess } from "../../components/form/FormAccess";
import { useLoginProviders } from "../../context/server-info/ServerInfoProvider";
import { ClientDescription } from "../ClientDescription";
import { getProtocolName } from "../utils";
import { Controller, useFormContext } from "react-hook-form";
import { FormGroup, Select, SelectOption, MenuToggle, SelectList } from "@patternfly/react-core";
import React, { useState, useEffect, useRef } from "react";

// Predefined client templates
const PRECONFIGURED_CLIENTS = [
  // 1. Custom OpenID-Connect
  {
    name: "Custom OpenID-Connect",
    clientId: "",
    nameValue: "",
    description: "A custom OpenID Connect client",
    protocol: "openid-connect",
    enabled: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: true,
    publicClient: false,
    authorizationServicesEnabled: true,
  },

  // 2. Custom SAML
  {
    name: "Custom SAML",
    clientId: "",
    nameValue: "",
    description: "A custom SAML client",
    protocol: "saml",
    enabled: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: true,
    publicClient: false,
    authorizationServicesEnabled: true,
  },

  // 3. Google SAML
  {
    name: "Google SAML",
    clientId: "google.com/a/{{gSuiteDomain}}",
    nameValue: "Google",
    description: "Integration with Google Workspace",
    protocol: "saml",
    enabled: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: true,
    publicClient: false,
    authorizationServicesEnabled: true,
    attributes: {
      "saml.assertion.signature": "true",
      "saml.multivalued.roles": "false",
      "saml.encrypt": "false",
      "saml_idp_initiated_sso_url_name": "googleapps",
      "saml.server.signature.keyinfo.ext": "false",
      "exclude.session.state.from.auth.response": "false",
      "saml_force_name_id_format": "true",
      "tls.client.certificate.bound.access.tokens": "false",
      "saml.client.signature": "false",
      "display.on.consent.screen": "false",
      "saml_name_id_format": "email",
      "saml.server.signature.keyinfo.xmlSigKeyInfoKeyNameTransformer": "NONE",
      "saml.onetimeuse.condition": "false"
    }
  },

  // 4. Slack SAML
  {
    name: "Slack SAML",
    clientId: "{{slackDomain}}",
    nameValue: "Slack",
    description: "Integration with Slack",
    protocol: "saml",
    enabled: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: false,
    publicClient: false,
    attributes: {
      "saml.assertion.signature": "true",
      "saml.force.post.binding": "false",
      "saml.multivalued.roles": "false",
      "saml.encrypt": "false",
      "saml.server.signature": "false",
      "saml.server.signature.keyinfo.ext": "false",
      "saml_idp_initiated_sso_url_name": "slack",
      "saml.force.name.id.format": "true",
      "saml.name.id.format": "email",
      "saml.assertion.lifespan": "60",
      "saml.artifact.binding": "false",
      "saml.client.signature": "false",
      "saml.authnstatement": "true",
      "saml.onetimeuse.condition": "false"
    }
  },

  // 5. Jira (Atlassian) SAML
  {
    name: "Jira (Atlassian) SAML",
    clientId: "{{atlassianDomain}}",
    nameValue: "Jira",
    description: "Integration with Jira",
    protocol: "saml",
    enabled: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: false,
    publicClient: false,
    attributes: {
      "saml.assertion.signature": "true",
      "saml.force.post.binding": "false",
      "saml.multivalued.roles": "false",
      "saml.encrypt": "false",
      "saml.server.signature": "true",
      "saml.server.signature.keyinfo.ext": "false",
      "saml_idp_initiated_sso_url_name": "jira",
      "saml.force.name.id.format": "true",
      "saml.name.id.format": "email",
      "saml.assertion.lifespan": "60",
      "saml.artifact.binding": "false",
      "saml.client.signature": "false",
      "saml.authnstatement": "true",
      "saml.onetimeuse.condition": "false"
    }
  },

  // 6. Dropbox SAML
  {
    name: "Dropbox SAML",
    clientId: "https://www.dropbox.com/saml2",
    nameValue: "Dropbox",
    description: "Integration with Dropbox",
    protocol: "saml",
    enabled: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: false,
    publicClient: false,
    attributes: {
      "saml.assertion.signature": "true",
      "saml.force.post.binding": "true",
      "saml.multivalued.roles": "false",
      "saml.encrypt": "false",
      "saml.server.signature": "false",
      "saml_idp_initiated_sso_url_name": "dropbox",
      "saml.force.name.id.format": "true",
      "saml.name.id.format": "email",
      "saml.assertion.lifespan": "60",
      "saml.artifact.binding": "false",
      "saml.client.signature": "false",
      "saml.authnstatement": "true"
    }
  },

  // 7. Office 365 SAML
  {
    name: "Office 365 SAML",
    clientId: "https://login.microsoftonline.com/{{tenantId}}/saml2",
    nameValue: "Office 365",
    description: "Integration with Office 365",
    protocol: "saml",
    enabled: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: false,
    publicClient: false,
    attributes: {
      "saml.assertion.signature": "true",
      "saml.force.post.binding": "true",
      "saml.multivalued.roles": "false",
      "saml.encrypt": "false",
      "saml.server.signature": "true",
      "saml_idp_initiated_sso_url_name": "office365",
      "saml.force.name.id.format": "true",
      "saml.name.id.format": "email",
      "saml.assertion.lifespan": "60",
      "saml.artifact.binding": "false",
      "saml.client.signature": "false",
      "saml.authnstatement": "true"
    }
  },

  // 8. Freshdesk OpenID-Connect
  {
    name: "Freshdesk OpenID-Connect",
    clientId: "",
    nameValue: "Freshdesk",
    description: "Integration with Freshdesk using OpenID Connect",
    protocol: "openid-connect",
    enabled: true,
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: false,
    publicClient: false,
    authorizationServicesEnabled: false,
    attributes: {
      "saml.assertion.signature": "false",
      "saml.force.post.binding": "false",
      "saml.multivalued.roles": "false",
      "saml.encrypt": "false",
      "saml.server.signature": "false",
      "saml.server.signature.keyinfo.ext": "false",
      "exclude.session.state.from.auth.response": "false",
      "saml.force.artifact.binding": "false",
      "saml.artifact.binding.identifier": "",
      "saml.artifact.binding.url": "",
      "saml.artifact.resolve": "false",
      "saml.artifact.binding": "false",
      "saml.authnstatement": "false",
      "saml.onetimeuse.condition": "false",
      "saml.client.signature": "false",
      "tls.client.certificate.bound.access.tokens": "false",
      "saml.server.signature.keyinfo": "false",
      "saml.assertion.lifespan": "",
      "client.secret.creation.time": "0",
      "access.token.lifespan": "",
      "saml.signature.algorithm": "RSA_SHA256",
      "saml_single_logout_service_url_redirect": "",
      "saml_single_logout_service_url_post": "",
      "saml.encryption.certificate": "",
      "saml.signing.certificate": "",
      "saml.signing.private.key": "",
      "saml.signature.canonicalization.method": "http://www.w3.org/2001/10/xml-exc-c14n#",
      "saml.encryption.private.key": "",
      "saml.idp.initiated.sso.url.name": "",
      "saml.idp.initiated.sso.relay.state": ""
    }
  }
];

type GeneralSettingsProps = {
  onTemplateChange?: (templateName: string) => void;
};

export const GeneralSettings = ({ onTemplateChange }: GeneralSettingsProps) => {
  const { t } = useTranslation();
  const providers = useLoginProviders();
  const { setValue, watch, getValues, control } = useFormContext();
  const protocol = watch("protocol");
  const [isOpen, setIsOpen] = useState(false);
  const currentTemplate = watch("template") || "Custom OpenID-Connect";
  const [selected, setSelected] = useState<string>(currentTemplate);
  const selectRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure default template exists in form on first render (if nothing set)
  useEffect(() => {
    if (!getValues("template")) {
      setValue("template", "Custom OpenID-Connect", { shouldDirty: false });
    }
  }, [setValue]);

  // Keep local selected synchronized when form template value changes
  useEffect(() => {
    if (currentTemplate && currentTemplate !== selected) {
      setSelected(currentTemplate);
    }
  }, [currentTemplate, selected]);

  // When component mounts or template changes, set form fields to template defaults
  useEffect(() => {
    const template = PRECONFIGURED_CLIENTS.find(t => t.name === currentTemplate) || 
                    PRECONFIGURED_CLIENTS[0]; // Fallback to first template
    
    if (template) {
      // Only update if the template is different from current form values
      const currentFormValues = getValues();
      const needsUpdate = Object.entries(template).some(([key, val]) => 
        typeof val !== "object" && currentFormValues[key] !== val
      );

      if (needsUpdate) {
        Object.entries(template).forEach(([key, val]) => {
          if (typeof val !== "object" && val !== undefined) {
            setValue(key, val, { shouldDirty: false });
          }
        });
        setValue("template", template.name, { shouldDirty: false });
        
        if (onTemplateChange) {
          onTemplateChange(template.name);
        }
      }
    }
  }, [setValue, onTemplateChange, currentTemplate, getValues]);


  const handleTemplateChange = (value: string) => {
    const template = PRECONFIGURED_CLIENTS.find(t => t.name === value);
    if (template) {
      Object.entries(template).forEach(([key, val]) => {
        if (typeof val !== "object") {
          setValue(key, val);
        }
      });
      // Only update these fields for custom templates
      if (["Custom OpenID-Connect", "Custom SAML", "Freshdesk OpenID-Connect"].includes(template.name)) {
        setValue("clientId", template.clientId || "");
        setValue("name", template.name || "");
        setValue("description", template.description || "");
      }

      // Update template field
      setValue("template", template.name, { shouldDirty: false });

      // Notify parent component of the selected template
      if (onTemplateChange) {
        onTemplateChange(template.name);
      }
      
      // Update local state
      setSelected(template.name);
    }
  };

  const onToggle = () => setIsOpen(!isOpen);

  const toggle = (toggleRef: React.Ref<HTMLButtonElement>) => (
    <MenuToggle ref={toggleRef} onClick={onToggle} isExpanded={isOpen}>
      {selected || t("selectClientTemplate")}
    </MenuToggle>
  );

  const onSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined
  ) => {
    handleTemplateChange(value as string);
    setIsOpen(false);
  };

  return (
    <FormAccess isHorizontal role="manage-clients">
      <Controller
        name="template"
        control={control}
        defaultValue="Custom OpenID-Connect"
        render={({ field: { value, onChange } }) => (
          <FormGroup
            label={t("preconfiguredClients")}
            labelIcon={
              <HelpItem
                helpText={t("preconfiguredClientsHelp")}
                fieldLabelId="preconfigured-clients"
              />
            }
            fieldId="preconfigured-clients"
            className="pf-m-inline"
          >
            <div ref={selectRef}>
              <Select
                id="preconfigured-clients"
                toggle={toggle}
                isOpen={isOpen}
                onSelect={(_, val) => {
                  onChange(val as string);
                  handleTemplateChange(val as string);
                  setIsOpen(false);
                }}
                selected={value}
                aria-label={t("preconfiguredClients")}
              >
                <SelectList>
                  {PRECONFIGURED_CLIENTS.map((client) => (
                    <SelectOption
                      key={client.name}
                      value={client.name}
                      description={client.description}
                    >
                      {client.name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </div>
          </FormGroup>
        )}
      />
      
      {/* <SelectControl
        name="protocol"
        label={t("clientType")}
        labelIcon={t("clientTypeHelp")}
        controller={{ defaultValue: protocol || "" }}
        options={providers.map((option) => ({
          key: option,
          value: getProtocolName(t, option),
        }))}
      /> */}
      <ClientDescription hasConfigureAccess selectedTemplate={selected}/>
    </FormAccess>
  );
};
