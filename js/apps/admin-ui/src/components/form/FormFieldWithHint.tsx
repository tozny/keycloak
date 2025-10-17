import { FormGroup } from '@patternfly/react-core';
import { HelpItem, TextControl } from '@keycloak/keycloak-ui-shared';
import { useTranslation } from 'react-i18next';
import './form-field-hint.css';

type FormFieldWithHintProps = {
  name: string;
  label: string;
  helpText: string;
  hintText?: string;
  required?: boolean;
  type?: string;
  rules?: any;
  className?: string;
};

export const FormFieldWithHint = ({
  name,
  label,
  helpText,
  hintText,
  required = false,
  type = 'text',
  rules = {},
  className = ''
}: FormFieldWithHintProps) => {
  const { t } = useTranslation();
  
  return (
    <FormGroup
      label={
        <div className="form-field-label">
          {t(label)}
          {required && <span className="pf-c-form__label-required" aria-hidden="true">*</span>}
          <span className="form-field-help-icon">
            <HelpItem
              helpText={t(helpText)}
              fieldLabelId={name}
            />
          </span>
        </div>
      }
      fieldId={name}
      className={`form-field-with-hint pf-m-inline ${className}`}
    >
      <div>
        <TextControl
          name={name}
          label={t(label)}
          type={type as any}
          aria-label={t(label)}
          rules={{ 
            required: required ? t('required') : false,
            ...rules
          }}
        />
        {hintText && (
          <div 
            className="pf-c-form__helper-text" 
            aria-live="polite"
          >
            {t(hintText)}
          </div>
        )}
      </div>
    </FormGroup>
  );
};