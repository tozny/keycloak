import { HelpItem } from "@keycloak/keycloak-ui-shared";
import {
  NumberControl,
  SelectControl,
  SelectControlOption,
} from "@keycloak/keycloak-ui-shared";
import { FormGroup, NumberInput, Switch } from "@patternfly/react-core";
import { Controller, UseFormReturn, useWatch } from "react-hook-form";
import { useEffect, type FocusEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FormAccess } from "../../components/form/FormAccess";
import { WizardSectionHeader } from "../../components/wizard-section-header/WizardSectionHeader";

export type SettingsCacheProps = {
  form: UseFormReturn;
  showSectionHeading?: boolean;
  showSectionDescription?: boolean;
  unWrap?: boolean;
};

const getValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const CacheFields = ({ form }: { form: UseFormReturn }) => {
  const { t } = useTranslation();

  const cachePolicyType = useWatch({
    control: form.control,
    name: "config.cachePolicy",
  });

  const cachePolicy = getValue(cachePolicyType);

  const hourOptions: SelectControlOption[] = [];
  let hourDisplay = "";
  for (let index = 0; index < 24; index++) {
    if (index < 10) {
      hourDisplay = `0${index}`;
    } else {
      hourDisplay = `${index}`;
    }
    hourOptions.push({ key: `${index}`, value: hourDisplay });
  }

  const minuteOptions: SelectControlOption[] = [];
  let minuteDisplay = "";
  for (let index = 0; index < 60; index++) {
    if (index < 10) {
      minuteDisplay = `0${index}`;
    } else {
      minuteDisplay = `${index}`;
    }
    minuteOptions.push({ key: `${index}`, value: minuteDisplay });
  }

  // Update the useWatch for passwordCacheEnabled to have a proper default
  const isPasswordCacheEnabled = useWatch({
    control: form.control,
    name: "config.passwordCacheEnabled",
    defaultValue: ["false"],
  });

  // Watch for password cache TTL value
  const passwordCacheTTL = useWatch({
    control: form.control,
    name: "config.passwordCacheTTL",
    defaultValue: form.getValues("config.passwordCacheTTL") || ["0"],
  });



  // Initialize form with default values if not set
  useEffect(() => {
    const currentValues = form.getValues();
    if (!currentValues.config?.passwordCacheEnabled) {
      form.setValue("config.passwordCacheEnabled", ["false"], { shouldDirty: false });
    }
    if (!currentValues.config?.passwordCacheTTL) {
      form.setValue("config.passwordCacheTTL", ["0"], { shouldDirty: false });
    }
  }, []);

  const handleNumberInputChange = (event: FormEvent<HTMLInputElement>) => {
    const value = (event.target as HTMLInputElement).value;
    if (value === '') {
      form.setValue("config.passwordCacheTTL", ["0"], { shouldDirty: true });
      return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      form.setValue("config.passwordCacheTTL", [numValue.toString()], {
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

  const handleNumberInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '') {
      form.setValue("config.passwordCacheTTL", ["0"], { shouldDirty: true });
    }
  };

  return (
    <>
      <SelectControl
        id="kc-cache-policy"
        name="config.cachePolicy"
        label={t("cachePolicy")}
        labelIcon={t("cachePolicyHelp")}
        controller={{
          defaultValue: ["DEFAULT"],
        }}
        aria-label={t("selectCacheType")}
        options={[
          "DEFAULT",
          "EVICT_DAILY",
          "EVICT_WEEKLY",
          "MAX_LIFESPAN",
          "NO_CACHE",
        ]}
      />
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
      {/* End of Tozny Customization */}
      {cachePolicy === "EVICT_WEEKLY" ? (
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
      {cachePolicy === "EVICT_DAILY" || cachePolicy === "EVICT_WEEKLY" ? (
        <>
          <SelectControl
            id="kc-eviction-hour"
            name="config.evictionHour[0]"
            label={t("evictionHour")}
            labelIcon={t("evictionHourHelp")}
            controller={{
              defaultValue: "0",
            }}
            aria-label={t("selectEvictionHour")}
            options={hourOptions}
          />
          <SelectControl
            id="kc-eviction-minute"
            name="config.evictionMinute[0]"
            label={t("evictionMinute")}
            labelIcon={t("evictionMinuteHelp")}
            controller={{
              defaultValue: "0",
            }}
            aria-label={t("selectEvictionMinute")}
            options={minuteOptions}
          />
        </>
      ) : null}
      {cachePolicy === "MAX_LIFESPAN" ? (
        <NumberControl
          data-testid="kerberos-cache-lifespan"
          name="config.maxLifespan[0]"
          label={t("maxLifespan")}
          labelIcon={t("maxLifespanHelp")}
          unit={t("ms")}
          controller={{ defaultValue: 0, rules: { min: 0 } }}
        />
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