import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { SupportedLocale, LanguageInfo, SUPPORTED_LANGUAGES, translations } from './translations';
import { getPreference, savePreference } from '../storage';

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (timestamp: number) => string;
  isRTL: boolean;
  languages: LanguageInfo[];
}

const PREF_KEY = 'user_locale';
const DEFAULT_LOCALE: SupportedLocale = 'es';

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Load persisted locale
    getPreference<SupportedLocale>(PREF_KEY, DEFAULT_LOCALE).then((saved) => {
      if (saved && translations[saved]) {
        setLocaleState(saved);
      }
    });
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    savePreference(PREF_KEY, newLocale);
  };

  const currentLangInfo = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === locale) || SUPPORTED_LANGUAGES[0];
  }, [locale]);

  const isRTL = currentLangInfo.dir === 'rtl';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [locale, isRTL]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[locale] || translations.es;
    let text = dict[key] || translations.es[key] || translations.en[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return text;
  };

  const numberFormatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 4,
    });
  }, [locale]);

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
    if (isNaN(value) || value === null || value === undefined) return '-';
    if (options) {
      return new Intl.NumberFormat(locale, options).format(value);
    }
    return numberFormatter.format(value);
  };

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [locale]);

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return '-';
    return dateFormatter.format(new Date(timestamp));
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        formatNumber,
        formatDate,
        isRTL,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export * from './translations';
