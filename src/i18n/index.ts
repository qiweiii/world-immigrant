export {
  defaultLocale,
  isLocale,
  localeHtmlLang,
  localeLabels,
  locales,
  LOCALE_STORAGE_KEY,
  matchBrowserLocale,
  nonDefaultLocales,
  type Locale,
} from "./locales";
export { alternateLocalePaths, localeFromPath, stripLocalePrefix, withLocale } from "./paths";
export { pickLocalized, type LocalizedValue } from "./resolve";
export { t, type UiKey } from "./ui";
