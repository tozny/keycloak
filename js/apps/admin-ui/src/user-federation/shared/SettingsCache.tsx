import {
  HelpItem,
  KeycloakSelect,
  SelectControl,
  SelectVariant,
} from "@keycloak/keycloak-ui-shared";
import { Switch } from "@patternfly/react-core";
import { FormGroup, NumberInput, SelectOption } from "@patternfly/react-core";
import { isEqual } from "lodash-es";
import { Controller, UseFormReturn, useWatch } from "react-hook-form";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FormAccess } from "../../components/form/FormAccess";
import { WizardSectionHeader } from "../../components/wizard-section-header/WizardSectionHeader";
import useToggle from "../../utils/useToggle";
import React from "react";

export type SettingsCacheProps = {
  form: UseFormReturn;
  showSectionHeading?: boolean;
  showSectionDescription?: boolean;
  unWrap?: boolean;
};

export const CacheFields = ({ form }: { form: UseFormReturn }): ReactElement => {
  const { t } = useTranslation();

  const [isCachePolicyOpen, toggleCachePolicy] = useToggle();
  const [isEvictionHourOpen, toggleEvictionHour] = useToggle();
  const [isEvictionMinuteOpen, toggleEvictionMinute] = useToggle();

  const cachePolicyType = useWatch({
    control: form.control,
    name: "config.cachePolicy",
  });

  const hourOptions = [
    <SelectOption key={0} value={[`0`]}>
      {[`00`]}
    </SelectOption>,
  ];
  let hourDisplay = "";
  for (let index = 1; index < 24; index++) {
    if (index < 10) {
      hourDisplay = `0${index}`;
    } else {
      hourDisplay = `${index}`;
    }
    hourOptions.push(
      <SelectOption key={index} value={[`${index}`]}>
        {hourDisplay}
      </SelectOption>,
    );
  }

  const minuteOptions = [
    <SelectOption key={0} value={[`0`]}>
      {[`00`]}
    </SelectOption>,
  ];
  let minuteDisplay = "";
  for (let index = 1; index < 60; index++) {
    if (index < 10) {
      minuteDisplay = `0${index}`;
    } else {
      minuteDisplay = `${index}`;
    }
    minuteOptions.push(
      <SelectOption key={index} value={[`${index}`]}>
        {minuteDisplay}
      </SelectOption>,
    );
  }

  // Update the useWatch for passwordCacheEnabled to have a proper default
  const isPasswordCacheEnabled = useWatch({
    control: form.control,
    name: "config.passwordCacheEnabled",
    defaultValue: [(form.getValues("config.passwordCacheTTL")?.[0] || "0") !== "0" ? "true" : "false"]
  });

  // Watch for password cache TTL value
  const passwordCacheTTL = useWatch({
    control: form.control,
    name: "config.passwordCacheTTL",
    defaultValue: form.getValues("config.passwordCacheTTL") || ["0"],
  });
  
  // Add this effect to initialize passwordCacheEnabled based on passwordCacheTTL
  React.useEffect(() => {
    const ttl = form.getValues("config.passwordCacheTTL")?.[0] || "0";
    const isEnabled = ttl !== "0";
    form.setValue("config.passwordCacheEnabled", [isEnabled.toString()], {
      shouldDirty: false,
      shouldValidate: true
    });
  }, [form.watch("config.passwordCacheTTL")]);

  // Initialize form with default values if not set
  React.useEffect(() => {
    const currentValues = form.getValues();
    if (!currentValues.config?.passwordCacheEnabled) {
      form.setValue("config.passwordCacheEnabled", ["false"], { shouldDirty: false });
    }
    if (!currentValues.config?.passwordCacheTTL) {
      form.setValue("config.passwordCacheTTL", ["0"], { shouldDirty: false });
    }
  }, []);

  const handleNumberInputChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = (event.target as HTMLInputElement).value;
    if (value === '') {
      form.setValue("config.passwordCacheTTL", ["0"], { shouldDirty: true });
      form.setValue("config.passwordCacheEnabled", ["false"], { shouldDirty: true });
      return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      form.setValue("config.passwordCacheTTL", [numValue.toString()], { 
        shouldDirty: true,
        shouldValidate: true 
      });
      form.setValue("config.passwordCacheEnabled", [(numValue > 0).toString()], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  };

  // Handle password cache toggle
  const handlePasswordCacheToggle = (checked: boolean) => {
    form.setValue("config.passwordCacheEnabled", [checked.toString()], {
      shouldDirty: true,
      shouldValidate: true
    });
    
    if (!checked) {
      form.setValue("config.passwordCacheTTL", ["0"], {
        shouldDirty: true,
        shouldValidate: true
      });
    } else if (form.getValues("config.passwordCacheTTL")?.[0] === "0") {
      // Only set a default TTL if it's currently 0
      form.setValue("config.passwordCacheTTL", ["300"], {
        shouldDirty: true,
        shouldValidate: true
      });
    }
  };

  const handleNumberInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '') {
      form.setValue("config.passwordCacheTTL", ["0"], { shouldDirty: true });
    }
  };

  return (
    <>
      <FormGroup
        label={t("cachePolicy")}
        labelIcon={
          <HelpItem
            helpText={t("cachePolicyHelp")}
            fieldLabelId="cachePolicy"
          />
        }
        fieldId="kc-cache-policy"
      >
        <Controller
          name="config.cachePolicy"
          defaultValue={["DEFAULT"]}
          control={form.control}
          render={({ field }) => (
            <KeycloakSelect
              toggleId="kc-cache-policy"
              onToggle={toggleCachePolicy}
              isOpen={isCachePolicyOpen}
              onSelect={(value) => {
                field.onChange(value as string);
                toggleCachePolicy();
              }}
              selections={field.value}
              variant={SelectVariant.single}
              data-testid="kerberos-cache-policy"
              aria-label={t("selectCachePolicy")}
            >
              <SelectOption key={0} value={["DEFAULT"]}>
                DEFAULT
              </SelectOption>
              <SelectOption key={1} value={["EVICT_DAILY"]}>
                EVICT_DAILY
              </SelectOption>
              <SelectOption key={2} value={["EVICT_WEEKLY"]}>
                EVICT_WEEKLY
              </SelectOption>
              <SelectOption key={3} value={["MAX_LIFESPAN"]}>
                MAX_LIFESPAN
              </SelectOption>
              <SelectOption key={4} value={["NO_CACHE"]}>
                NO_CACHE
              </SelectOption>
            </KeycloakSelect>
          )}
        />
      </FormGroup>
      
      {/* 
        Tozny Customization: Password Cache Settings
        
        These fields enable caching of password verification results to reduce LDAP server load.
        - passwordCacheEnabled: Toggles the password cache on/off
        - passwordCacheTTL: Time-to-live in seconds for cached password verification results
        
        Note: This is a Tozny-specific optimization and not part of the standard Keycloak LDAP provider.
      */}
      <FormGroup 
        label={t("passwordCache")}
        labelIcon={
          <HelpItem
            helpText={t("passwordCacheHelp")}
            fieldLabelId="passwordCache"
          />
        }
        fieldId="kc-password-cache"
        hasNoPaddingTop
      >
        <Controller
          name="config.passwordCacheEnabled"
          defaultValue={["false"]}
          control={form.control}
          render={({ field }) => (
            <Switch
              id="kc-password-cache-switch"
              data-testid="password-cache-switch"
              isDisabled={false}
              onChange={(_event, value) => handlePasswordCacheToggle(value)}
              isChecked={field.value?.[0] === "true"}
              label={t("on")}
              labelOff={t("off")}
              aria-label={t("passwordCache")}
            />
          )}
        />
      </FormGroup>
      {isPasswordCacheEnabled?.[0] === "true" && (
        <FormGroup
          label={t("passwordCacheTTL")}
          labelIcon={
            <HelpItem
              helpText={t("passwordCacheTTLHelp")}
              fieldLabelId="passwordCacheTTL"
            />
          }
          fieldId="kc-password-cache-ttl"
        >
          <NumberInput
            id="kc-password-cache-ttl"
            value={parseInt(passwordCacheTTL?.[0] || "0")}
            min={0}
            isDisabled={isPasswordCacheEnabled?.[0] !== "true"}
            onPlus={() => {
              const current = parseInt(passwordCacheTTL?.[0] || "0");
              form.setValue("config.passwordCacheTTL", [(current + 1).toString()], { 
                shouldDirty: true,
                shouldValidate: true 
              });
            }}
            onMinus={() => {
              const current = parseInt(passwordCacheTTL?.[0] || "0");
              if (current > 0) {
                form.setValue("config.passwordCacheTTL", [(current - 1).toString()], { 
                  shouldDirty: true,
                  shouldValidate: true 
                });
              }
            }}
            onChange={handleNumberInputChange}
            onBlur={handleNumberInputBlur}
            inputName="passwordCacheTTL"
            inputAriaLabel={t("passwordCacheTTL")}
          />
        </FormGroup>
      )}
      {isEqual(cachePolicyType, ["EVICT_WEEKLY"]) ? (
        <SelectControl
          id="kc-eviction-day"
          name="config.evictionDay[0]"
          label={t("evictionDay")}
          labelIcon={t("evictionDayHelp")}
          controller={{
            defaultValue: "1",
          }}
          aria-label={t("selectEvictionDay")}
          options={[
            { key: "1", value: t("Sunday") },
            { key: "2", value: t("Monday") },
            { key: "3", value: t("Tuesday") },
            { key: "4", value: t("Wednesday") },
            { key: "5", value: t("Thursday") },
            { key: "6", value: t("Friday") },
            { key: "7", value: t("Saturday") },
          ]}
        />
      ) : null}
      {isEqual(cachePolicyType, ["EVICT_DAILY"]) ||
      isEqual(cachePolicyType, ["EVICT_WEEKLY"]) ? (
        <>
          <FormGroup
            label={t("evictionHour")}
            labelIcon={
              <HelpItem
                helpText={t("evictionHourHelp")}
                fieldLabelId="evictionHour"
              />
            }
            isRequired
            fieldId="kc-eviction-hour"
          >
            <Controller
              name="config.evictionHour"
              defaultValue={["0"]}
              control={form.control}
              render={({ field }) => (
                <KeycloakSelect
                  toggleId="kc-eviction-hour"
                  onToggle={toggleEvictionHour}
                  isOpen={isEvictionHourOpen}
                  onSelect={(value) => {
                    field.onChange(value as string);
                    toggleEvictionHour();
                  }}
                  selections={field.value}
                  variant={SelectVariant.single}
                  aria-label={t("selectEvictionHour")}
                >
                  {hourOptions}
                </KeycloakSelect>
              )}
            />
          </FormGroup>
          <FormGroup
            label={t("evictionMinute")}
            labelIcon={
              <HelpItem
                helpText={t("evictionMinuteHelp")}
                fieldLabelId="evictionMinute"
              />
            }
            isRequired
            fieldId="kc-eviction-minute"
          >
            <Controller
              name="config.evictionMinute"
              defaultValue={["0"]}
              control={form.control}
              render={({ field }) => (
                <KeycloakSelect
                  toggleId="kc-eviction-minute"
                  onToggle={toggleEvictionMinute}
                  isOpen={isEvictionMinuteOpen}
                  onSelect={(value) => {
                    field.onChange(value as string);
                    toggleEvictionMinute();
                  }}
                  selections={field.value}
                  variant={SelectVariant.single}
                  aria-label={t("selectEvictionMinute")}
                >
                  {minuteOptions}
                </KeycloakSelect>
              )}
            />
          </FormGroup>
        </>
      ) : null}
      {isEqual(cachePolicyType, ["MAX_LIFESPAN"]) ? (
        <FormGroup
          label={t("maxLifespan")}
          labelIcon={
            <HelpItem
              helpText={t("maxLifespanHelp")}
              fieldLabelId="maxLifespan"
            />
          }
          fieldId="kc-max-lifespan"
        >
          <Controller
            name="config.maxLifespan[0]"
            defaultValue={0}
            control={form.control}
            render={({ field }) => {
              const MIN_VALUE = 0;
              const setValue = (newValue: number) =>
                field.onChange(Math.max(newValue, MIN_VALUE));

              return (
                <NumberInput
                  id="kc-max-lifespan"
                  data-testid="kerberos-cache-lifespan"
                  value={field.value}
                  min={MIN_VALUE}
                  unit={t("ms")}
                  type="text"
                  onPlus={() => field.onChange(Number(field.value) + 1)}
                  onMinus={() => field.onChange(Number(field.value) - 1)}
                  onChange={(event) => {
                    const newValue = Number(event.currentTarget.value);
                    setValue(!isNaN(newValue) ? newValue : 0);
                  }}
                />
              );
            }}
          />
        </FormGroup>
      ) : null}
    </>
  );
};

export const SettingsCache = ({
  form,
  showSectionHeading = false,
  showSectionDescription = false,
  unWrap = false,
}: SettingsCacheProps) => {
  const { t } = useTranslation();

  return (
    <>
      {showSectionHeading && (
        <WizardSectionHeader
          title={t("cacheSettings")}
          description={t("cacheSettingsDescription")}
          showDescription={showSectionDescription}
        />
      )}
      {unWrap ? (
        <CacheFields form={form} />
      ) : (
        <FormAccess role="manage-realm" isHorizontal>
          <CacheFields form={form} />
        </FormAccess>
      )}
    </>
  );
};