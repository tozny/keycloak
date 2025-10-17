import { ReactNode } from 'react';
import { FormGroup, HelpItem } from '@patternfly/react-core';
import { TextControl } from './TextControl';
import { useTranslation } from 'react-i18next';

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
      label={t(label)}
      fieldId={name}
      labelIcon={
        <HelpItem
          helpText={t(helpText)}
          fieldLabelId={name}
        />
      }
      labelIconPosition="right"
      className={`pf-m-inline ${className}`}
    >
      <div>
        <TextControl
          name={name}
          type={type}
          aria-label={t(label)}
          rules={{ 
            required: required ? t('required') : false,
            ...rules
          }}
        />
        {hintText && (
          <div 
            className="pf-c-form__helper-text" 
            style={{ 
              marginLeft: 0,
              marginTop: '0.25rem'
            }}
            aria-live="polite"
          >
            {t(hintText)}
          </div>
        )}
      </div>
    </FormGroup>
  );
};