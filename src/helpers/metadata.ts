import type { CollectionMetadata } from "../types";
import { AOC_NAMESPACES, ELEVATION_NAMESPACES, FILOSOFI_NAMESPACES, IMAGE_INDEX_NAMESPACES, IRIS_NAMESPACES, LOCAL_NAMESPACES, NO_USE_CASE_NAMESPACES, NON_SPATIAL_NAMESPACES, OTHER_NAMESPACES_TO_KEEP, OUTDATED_NAMESPACES, POI_ZAI_NAMESPACES, TEST_NAMESPACES } from "./known_namespaces";


/**
 * Check if a namespace is a test namespace.
 * @param namespace 
 * @returns True if the namespace is a test namespace, false otherwise.
 */
function isTestNamespace(namespace: string): boolean {
    if (TEST_NAMESPACES.includes(namespace)) {
        return true;
    }
    if (LOCAL_NAMESPACES.includes(namespace)) {
        return true;
    }
    if (namespace.startsWith('test_')) {
        return true;
    }
    if (namespace.includes('_test_')) {
        return true;
    }
    if (namespace.endsWith('_test')) {
        return true;
    }
    return false;
}


function isImageIndexNamespace(namespace: string): boolean {
    if (IMAGE_INDEX_NAMESPACES.includes(namespace)) {
        return true;
    }
    if (namespace.startsWith('ORTHOIMAGERY.')) {
        return true;
    }
    return false;
}


/**
 * Get the metadata of a collection from its namespace.
 * @param namespace - The namespace of the collection
 * @returns The metadata of the collection
 */
export function getMetadataFromNamespace(namespace: string): CollectionMetadata {

    if (isTestNamespace(namespace)) {
        return { ignored: true, ignoredReason: 'Test data' };
    }

    if (isImageIndexNamespace(namespace)) {
        return { ignored: true, ignoredReason: 'Image index dataset' };
    }

    if (NON_SPATIAL_NAMESPACES.includes(namespace)) {
        return { ignored: true, ignoredReason: 'Non-spatial dataset' };
    }

    /**
     * Keep AOC-VITICOLES datasets
     */
    if (AOC_NAMESPACES.includes(namespace)) {
        return { product: "AOC", ignored: false };
    }

    /**
     * Keep POI_ZAI datasets
     */
    if (POI_ZAI_NAMESPACES.includes(namespace)) {
        return { product: "POI_ZAI", ignored: false };
    }

    /**
     * Ignore Elevation datasets
     */
    if (ELEVATION_NAMESPACES.includes(namespace)) {
        return { product: "Elevation", ignored: true, ignoredReason: 'In use via almimetry service' };
    }

    /**
     * Keep IRIS and FILOSOFI datasets
     */
    if (IRIS_NAMESPACES.includes(namespace)) {
        return { product: "IRIS", ignored: false };
    }
    if (FILOSOFI_NAMESPACES.includes(namespace)) {
        return { product: "FILOSOFI", ignored: false };
    }

    /**
     * Ignore PSRF datasets
     */
    if (NO_USE_CASE_NAMESPACES.includes(namespace)) {
        return { ignored: true, ignoredReason: 'No MCP use case for this dataset' };
    }

    /*
     * Keep communes, departements, regions, etc.
     */
    if (namespace.startsWith('LIMITES_ADMINISTRATIVES_EXPRESS.')) {
        return { product: 'LIMITES_ADMINISTRATIVES_EXPRESS.', ignored: false };
    }
    if (namespace.startsWith('ADMINEXPRESS-COG.')) {
        return { product: 'ADMINEXPRESS-COG', ignored: false };
    }
    if (namespace.startsWith('ADMINEXPRESS-COG-CARTO-PE.')) {
        return { product: 'ADMINEXPRESS-COG-CARTO-PE', ignored: false };
    }
    if (namespace.startsWith('ADMINEXPRESS-COG-CARTO.')) {
        return { product: 'ADMINEXPRESS-COG-CARTO', ignored: false };
    }
    // 'ADMINEXPRESS_COG_2018_CARTO'
    if (namespace === 'ADMINEXPRESS_COG_2018_CARTO') {
        return { product: 'ADMINEXPRESS_COG_CARTO', ignored: true, ignoredReason: 'Only 2018 data available, using ADMINEXPRESS-COG-CARTO instead' };
    }

    // keep only current version of BDTOPO_V3
    if (namespace === 'BDTOPO_V3') {
        return { product: 'BDTOPO_V3', ignored: false };
    }
    if (namespace === 'BDTOPO_V3_DIFF') {
        return { product: 'BDTOPO_V3_DIFF', ignored: true, ignoredReason: 'Historical data' };
    }

    // keep BDCARTO_V5
    if (namespace === 'BDCARTO_V5') {
        return { product: 'BDCARTO_V5', ignored: false };
    }

    // ignore BAN-PLUS and BAN.DATA.GOUV
    if (namespace === 'BAN-PLUS' || namespace === 'BAN.DATA.GOUV') {
        return { product: namespace, ignored: true, ignoredReason: 'Using geocoding service in the MCP' };
    }

    // keep PARCELLAIRE_EXPRESS and ignore BDPARCELLAIRE 
    if (namespace.startsWith('BDPARCELLAIRE-VECTEUR_WLD_BDD_WGS84G')) {
        return { product: 'BDPARCELLAIRE', ignored: true, ignoredReason: 'Deprecated dataset, using CADASTRALPARCELS.PARCELLAIRE_EXPRESS instead' };
    }
    if (namespace.startsWith('CADASTRALPARCELS.')) {
        return { product: 'CADASTRE', ignored: false };
    }

    // ignore outdated datasets
    if (OUTDATED_NAMESPACES.includes(namespace)) {
        return { product: namespace, ignored: true, ignoredReason: 'Outdated dataset' };
    }

    // keep RPG datasets
    if (namespace.startsWith('RPG.')) {
        return { product: 'RPG', ignored: false };
    }

    /*
     * Keep data from www.geoportail-urbanisme.gouv.fr 
     */
    if (namespace.startsWith('wfs_du')) {
        return { product: 'GPU_DU', ignored: false };
    }
    if (namespace.startsWith('wfs_scot')) {
        return { product: 'GPU_SCOT', ignored: false };
    }
    if (namespace.startsWith('wfs_sup')) {
        return { product: 'GPU_SUP', ignored: false };
    }

    /*
     * keep patrinat as it seems interesting for MCP even if there is a namespace for each table and many codes
     */
    if (namespace.startsWith('patrinat_')) {
        return { product: 'patrinat', ignored: false };
    }

    // ignore LANDCOVER for now
    if (namespace.startsWith('LANDCOVER.')) {
        return { product: 'LANDCOVER', ignored: true, ignoredReason: 'No MCP use case for this dataset' };
    }

    // keep ecoregions and ignore pays_ecoregions (duplicated data?)
    if (namespace === 'ecoregions') {
        return { product: 'ecoregions', ignored: false };
    }
    if (namespace === 'pays_ecoregions') {
        return { product: 'pays_ecoregions', ignored: true, ignoredReason: 'Duplicated data with ecoregions?' };
    }

    // keep other namespaces
    if (OTHER_NAMESPACES_TO_KEEP.includes(namespace)) {
        return { product: 'unknown', ignored: false };
    }

    // all other namespace are ignored
    return { ignored: true, ignoredReason: 'New namespace to add in the MCP' };
}
