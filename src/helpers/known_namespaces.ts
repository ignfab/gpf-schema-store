
/**
 * Test namespaces to ignore
 */
export const TEST_NAMESPACES = [
    'route500logoqgis',
    'vflorent__vecteur_wfs_bdd',
    'voeux_wfs',
    'voeux2026',
    'masseeausouterraine972_wfs',
    'monterritoire_gpkg_29-07-2025_wfs',
    'n_dfci_zone_regl_s_034_zip_03-02-2026_wfs',
    'n_zone_reg_pprn_20180013_s_072_gpkg_05-11-2025_wfs',
    'pat_r84_nov2025_gpkg_2026-02-10_wfs',
    'pnrvn_gpkg_27-06-2025_wfs',
    'projet_iqp_2025_gpkg_12-03-2026_wfs',
    'projets_zones_acceleration_energies_renouvelables_zaer_wfs',
    'ramsar-wfs',
    'unesco_pelee_wfs',
    'sentiers_pag_gpkg_30-01-2026_wfs',
    'site_guadeloupe_martinique_gpkg_26-01-2026_wfs',
    'sites_guyane_gpkg_26-01-2026_wfs',
    'sites_metropole_gpkg_26-01-2026_wfs',
    'sites_reunion_gpkg_26-01-2026_wfs',
    'trichls_s_d51_gpkg_07-10-2024_wfs',
    'trichlscomm_s_d51_gpkg_07-10-2024_wfs',
    'trichlsetamt_s_d51_gpkg_07-10-2024_wfs',
    'zdh_87_gpkg_15-01-2025_wfs',
    'zonealertesecheresse972_gpkg_27-09-2024_wfs',
    'zppa_cvl_executoire_2025_gpkg_06-03-2026_wfs',
    'ZZZ_INAO_LaCiotat', //batiment|commune|point_du_reseau|troncon_de_route
    'aeag-rwbody-sdage2022', //rwbody_ag_sdage2022
    'carr_10km_gpkg_24-10-2024_wfs', //carr_10km
    'carr_1km_zip_24-10-2024_wfs', //carr_1km
    'carr_200m_zip_24-10-2024_wfs', //carr_200m
    'Bacquelot__vecteur_wfs_bdd', //canton
    'cavp_zae_zip_03-02-2026_wfs', //ZAE_CA_Val_Parisis
    'charbo_gpkg_30-10-2025_wfs', //detections_charbonnieres|detections_ldo_fours
    'commune_d34OPenIG_gpkg_26-03-2025_wfs', //commune_d034_20170303zip
    'communes_972', //commune972
    'cosia_032_aubiet', //data_aubiet_25_05
    'dgac_peb_arrete_wfs', //dgac_peb_arrete_wfs
    'dgac_psa_arrete_wfs', //dgac_psa_arrete
    'l_rgc_l_008_20-02-2026_wfs', //l_rgc_l_008
    'l_rgc_l_008_gpkg_20-02-2026_wfs', //l_rgc_l_008
    'lls_wfs', //llssiap
    'igngpf_4902_20260309_tables_sans_tirets', //parcs_photovoltaiques

    'OCS-BFC_2017_BDD_WLD_WM_WFS_23-07-2021', //communes|indicateur9_2017|ocsge_58_2017_man_20p
];

/**
 * Local namespaces to ignore
 */
export const LOCAL_NAMESPACES = [
    'FAYL_PCRS_vecteur_wfs_public', //arbre|avaloir|bordure|bouche_poteau_incendie|branchement_vanne_bouche_a_clef|escalier|bati_facade|mur|poteau_poteau_eclairage|signalisation_verticale|tampon_plaque_chambre|bati_toit

    'OCS-GERS_BDD_LAMB93_2016', //oscge_gers_32_2016
    'OCS-GERS_BDD_LAMB93_2019', //oscge_gers_32_2019
    
    'MasseEauTransition972_wfs', //masseeautransition972 â massedeautransition_20152021
];

/**
 * Image index namespaces to ignore
 */
export const IMAGE_INDEX_NAMESPACES = [
    'IGNF_MNH-LIDAR-HD', //bloc|dalle
    'IGNF_MNS-LIDAR-HD', //bloc|dalle
    'IGNF_MNT-LIDAR-HD', //bloc|dalle
    'IGNF_NUAGES-DE-POINTS-LIDAR-HD', //bloc|dalle

    'GEOGRAPHICALGRIDSYSTEM.DFCI', //carro_dfci_1x1_l93|carro_dfci_2x2_l93
    'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25.GRAPHE-MOSAIQUAGE', //graphe_scan25
    'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950.GRAPHE', //ta_france_cartes_50k_1950_date_wm

    'cartes', 'cartes_test', 'cartes_anciennes',  // Géothèque
    'pva', // datasets|images - PVA IGN

    'GRAPHE.PCRS.ANCT', //graphe_pcrs_anct
];

/**
 * Non spatial namespaces to ignore
 */
export const NON_SPATIAL_NAMESPACES = [
    'BDTOPO.EXTENSION.NOM_USUEL', //extension_nom_usuel
];

/**
 * Outdated namespaces to ignore
 */
export const OUTDATED_NAMESPACES = [
    'SANTE_BDD_SYMBO_FXX_WM_20171227', // hopitaux
    'CGET_QP_BDD_WLD_WM_20160412', //qp_decretmodif_2015_epsg3857_wm
];


/**
 * Elevation namespaces to ignore
 */
export const ELEVATION_NAMESPACES = [
    'ELEVATION.CONTOUR.LINE', //courbe
    'ELEVATIONGRIDCOVERAGE.HIGHRES.QUALITY', //source_fra
];

/**
 * AOC namespaces to keep
 */
export const AOC_NAMESPACES = [
    'AOC-VITICOLES', //aire_parcellaire
]

/**
 * IRIS namespaces to keep
 */
export const IRIS_NAMESPACES = [
    'STATISTICALUNITS.IRIS', //contours_iris
    'STATISTICALUNITS.IRIS.PE', //contours_iris_pe
    'STATISTICALUNITS.IRISGE', //iris_ge
    'DREAL.ZONAGE_PINEL', //carreaux|communes|iris
];

/**
 * FILOSOFI namespaces to keep
 */
export const FILOSOFI_NAMESPACES = [
    'INSEE.FILOSOFI.INDICATORS', //carreaux_1km|carreaux_200m
];

/**
 * Namespace without use case for MCP
 */
export const NO_USE_CASE_NAMESPACES = [
    /*
     * Points de Rencontre de Secours en Forêt (PRSF)
     */
    'PROTECTEDAREAS.PRSF', //prsf
    'PRSF_BDD_GLP_2023', //prs_glp
    'PRSF_BDD_GUF_2023', //prs_guf
    'PRSF_BDD_REU_2023', //prs_reu

    /**
     * Projet agro-environnemental et climatique (PAEC)
     */
    'paec_bfc_2023', //Territoires_paec_bfc_2023
    'paec_bfc_2024', //Territoires_paec_bfc_2024
    'paec_bfc_2025', //Territoires_paec_bfc_2025
    'potentiel_agronomique_CCC', //potentiel agronomique

    /*
     * VIGICUES
     */
    'VIGICRUES', //stations|territoires|troncons
    'VIGICRUES-INT', //stations|territoires|troncons
    'VIGICRUES-QUA', //stations|territoires|troncons
    'VIGICRUES-QUA-2023', //stations|territoires|troncons
    'VIGICRUES_STATIONS_BDD_WLD_WM_2023-v1', //referentiel
    'VIGICRUES_TERRITOIRES_BDD_WLD_WM_2023-v1', //referentiel
    'VIGICRUES_TRONCONS_BDD_WLD_WM_2023-v1', //referentiel
    'VIGINOND-DIFFUSION', //stationhydro|zich|zip

    /*
     * Géodésie
     */
    'GEODESIE', //data_geod
    'IGNF_GEODESIE', //site-rbf|site-rdf|triplet|point-rdf|point-rbf|rn|rgp

    /*
     * Conservatoire Littoral
     */
    'CONSERVATOIRE_LITTORAL.PARCELLES', //parcelles_protegees
    'CONSERVATOIRE_LITTORAL.PERIMETRES', //perimetre_intervention

    /*
     * Observatoire des Forêts
     */
    'ObsForets.Gestion', //part_forets_publiques_dep_2017_2021
    'ObsForets.Ressources', //volume_moyen_ha_dep_2018_2022|volume_sur_pied_dep_2017_2021|volume_sur_pied_region_2017_2021
    'ObsForets.Ressources.TxBoisement', //taux_boisement_communal|taux_boisement_dep_2018_2022
    'ObsForets.Sols', //repartition_niveaux_trophiques_2018_2022|repartition_niveaux_trophiques_toutes_campagnes

    /**
     * Zones à prospecter pour les forêts subnaturelles
     */
    'ZONES-A-PROSPECTER-FORETS-SUBNATURELLES', //zones_a_prospecter_forets_subnaturelles

    /**
     * DGCL
     */
    'DGCL.2025', //voirie_communale|voirie_departementale

    /**
     * BDCARTO_ETAT-MAJOR
     */
    'BDCARTO_ETAT-MAJOR.NIVEAU3',
    'BDCARTO_ETAT-MAJOR.NIVEAU4',
];

/**
 * POI_ZAI namespaces to keep
 */
export const POI_ZAI_NAMESPACES = [
    'PARKING.SUP.500', //parkings_sup500m2
    'POI.CULTURE_LOISIRS', //pai_culture_et_loisirs

    'UTILIYANDGOVERNMENTALSERVICES.IGN.POI.GARES', //gares
    'GARES_BDD_FXX_WM_20171227', //gares
    
    'UTILIYANDGOVERNMENTALSERVICES.IGN.POI.SANTE', //hopitaux
    'LABELS.TOURISTIQUES', //communes_touristiques|stations_classees|stations_vertes|villages_etape    
];


/**
 * Other namespaces to keep
 */
export const OTHER_NAMESPACES_TO_KEEP = [
    'AREAMANAGEMENT.QP.VECTOR', //qp_decretmodif_2015_epsg3857_wm
    'AREAMANAGEMENT.ZFU.VECTOR', //zfu
    'AREAMANAGEMENT.ZUS.VECTOR', //zus
    'BDFORETV1_BDD_FXX_LAMB93_20140403', //resu_bdv1_shape
    'COMMUNES.EPCISANSFISCALITEPROPRE', //intercomm_groupement
    'Carhab_habitat', //habitats_carhab
    'Carhab_habitat_Reunion', //habitats_carhab
    'DEBROUSSAILLEMENT', //debroussaillement
    'DGAC-PGS-POI_BDD_FXX_WM', //aerodrome_avec_pgs_wm
    'DGAC-PGS_BDD_FXX_WM', //fxx_pgs_wm
    'HAIES.BOCAGES', //haie
    'HYDROGRAPHY.BCAE.LATEST', //bcae_cours_eau
    'IGNF_ACCESSIBILITE-PHYSIQUE-FORETS-', //acces_porteur|acces_skidder
    'IGNF_ACCESSIBILITE-PHYSIQUE-FORETS-MASQUE-FORETV3', //acces_porteur|acces_skidder
    'IGNF_BD-FRANCE-TOPO-VEGETATION', //BD-FRANCE-TOPO-VEGETATION
    'IGNF_CARTO-FORMATIONS-VEGETALES_2016', //formations_vegetales_d976_2016
    'IGNF_CARTO-FORMATIONS-VEGETALES_2017', //formations_vegetales_d972_2017
    'IGNF_CARTO-FORMATIONS-VEGETALES_2023', //formations_vegetales_d976_2023
    'IGNF_MASQUE-FORET.2021-2023', //masque_foret
    'IGNF_RPG_PARCELLES-AGRICOLES-CATEGORISEES_2024', //parcelles_agricole_categorisees_2024
    'IGNF_RPG_PARCELLES-ELIGIBLES-IAE', //parcelles_eligibles_iae_2024
    'IGNF_RPG_PRAIRIES-PERMANENTES_2024', //prairies_permanentes_2024
    'IGNF_RPG_ZONES-DENSITE-HOMOGENE_2024', //surfaces_2024_zdh_20250621
    'INPE', //inpe
    'INRA.CARTE.SOLS', //geoportail_vf
    'MESURES_COMPENSATOIRES', //emprises_commune|emprises_lineaires|emprises_polygones|emprises_ponctuelles
    'NAVIFOREST_PUBLIC', //itineraires-bois-ronds
    'OFB.ZONES.EXCLUES', //zones_exclues_aires_acceleration_eolien_terrestre
    'OFB.ZONES.NECESSITANT.AVIS.GESTIONNAIRE', //zones_necessitant_avis_gestionnaire_terrestre
    'OFB_ZONES.EXCLUES.SAUF.TOITURE', //zones_exclues_aires_acceleration_sauf_toiture
    'POTENTIEL.EOLIEN.REGLEMENTAIRE', //cartepotentieleolien_2023_enjeu_0_metropole_drom_wgs84|cartepotentieleolien_2023_enjeu_1_metropole_drom_wgs84|cartepotentieleolien_2023_enjeu_2_metropole_drom_wgs84|cartepotentieleolien_2023_enjeu_3_metropole_drom_wgs84|cartepotentieleolien_2023_enjeu_4_metropole_wgs84|cartepotentielpetiteolien_2023_enjeu_0_drom_wgs84
    'POTENTIEL.HYDRO', //potentiel_hydroelectrique
    'POTENTIEL.SOLAIRE.BATIMENT', //bati
    'POTENTIEL.SOLAIRE.SOL', //pv_sol_metropole_guadeloupe_martinique
    'PRAIRIES.SENSIBLES.BCAE', //prairies_sensibles
    'REPARTITION.POTENTIEL.METHANISATION.2050', //potentiel_methanisation_2050
    'SECUROUT.TE', //franchissement_te_lien_prescription|franchissement_te|prescription_te|troncon_te|troncon_te_lien_prescription
    'STOCK_CARBONE_REG_2015', //stock_carbone_regions
    'TERAGIR', //clef_verte|pavillon_bleu
    'TOURBIERES_ZONES-HUMIDES.BCAE', //bcae
    'TRACES.RANDO.HIVERNALE', //traces_rando_hivernale
    'TRANSPORTS.DRONES.RESTRICTIONS', //carte_restriction_drones_lf
    'espace_revendeurs', //grid|product
    'fr_qa_stations', //stations_qualite_air
    'zaer', //zaer
];
