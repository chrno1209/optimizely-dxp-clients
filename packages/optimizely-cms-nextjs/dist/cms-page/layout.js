import { Utils } from "@remkoj/optimizely-cms-react";
import { getMetaDataByPath as getMetaDataByPathBase } from './data';
import { getServerClient } from "../client";
import { isDebug } from '@remkoj/optimizely-cms-react/rsc';
const defaultCreateLayoutOptions = {
    defaultLocale: null,
    getMetaDataByPath: getMetaDataByPathBase,
    client: getServerClient
};
export function createLayout(options) {
    const { defaultLocale, getMetaDataByPath, client: clientFactory, channel } = {
        ...defaultCreateLayoutOptions,
        ...{ defaultLocale: null },
        ...options
    };
    const pageLayoutDefinition = {
        /**
         * Make sure that there's a sane default for the title, canonical URL
         * and the language alternatives
         *
         * @param       props   The layout properties
         * @returns     The metadata that must be merged into the defaults
         */
        generateMetadata: async ({ params }, resolving) => {
            const relativePath = `/${params.path ? '/' + params.path.join('/') : ''}`;
            if (isDebug())
                console.log(`⚪ [CmsPageLayout] Generating metadata for: ${relativePath}`);
            const variables = {
                path: relativePath
            };
            const client = clientFactory();
            const response = await getMetaDataByPath(client, variables).catch(e => {
                console.error(`[CmsPageLayout] Metadata error:`, e);
                return undefined;
            });
            const metadata = (response?.getGenericMetaData?.items ?? [])[0];
            if (!metadata) {
                if (isDebug())
                    console.log(`🟡 [CmsPageLayout] Unable to locate metadata for: ${relativePath}`);
                return {};
            }
            const base = await resolving;
            const title = base?.title?.template ? {
                template: base?.title?.template,
                default: metadata.name
            } : metadata.name;
            let pageMetadata = {
                title,
                alternates: {
                    canonical: metadata.canonical,
                    languages: {}
                },
                openGraph: {
                    ...base.openGraph,
                    title,
                    url: metadata.canonical,
                    alternateLocale: []
                }
            };
            // Add alternative URLs
            const alternates = (metadata?.alternatives || []).filter(Utils.isNotNullOrUndefined);
            alternates.forEach(alt => {
                if (pageMetadata.openGraph && Array.isArray(pageMetadata.openGraph.alternateLocale)) {
                    pageMetadata.openGraph.alternateLocale.push(alt.locale);
                }
                if (pageMetadata.alternates && pageMetadata.alternates.languages) {
                    //@ts-expect-error We need the locale to be dynamic, based upon the locales provided by the CMS
                    pageMetadata.alternates.languages[alt.locale] = alt.href;
                }
            });
            return pageMetadata;
        },
        PageLayout: ({ children }) => children
    };
    return pageLayoutDefinition;
}
export default createLayout;
//# sourceMappingURL=layout.js.map