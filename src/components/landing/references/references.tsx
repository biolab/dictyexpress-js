import React, { ReactElement } from 'react';
import { ReferencesContainer } from './references.styles';
import Reference from './reference';
import { SectionContentContainer } from 'components/landing/common/layout.styles';
import { Title } from 'components/landing/common/title.styles';
import SectionNames from 'components/landing/common/constants';

const References = (): ReactElement => (
    <SectionContentContainer id={SectionNames.REFERENCES}>
        <Title>References</Title>
        <ReferencesContainer>
            <Reference
                authors="Katoh-Kurasawa M, Trnovec L, Lehmann P, Chen R, Li Y, Zupan B, Shaulsky G"
                source="Nature Communications 2026"
            >
                <a href="https://pubmed.ncbi.nlm.nih.gov/41792273/">
                    Early cAMP signaling orchestrates single-cell synchronicity throughout{' '}
                    <i>Dictyostelium</i> development
                </a>
            </Reference>
            <Reference
                authors="Katoh-Kurasawa M, Trnovec L, Lehmann P, Zupan B, Shaulsky G"
                source="BMC Genomics 2025"
            >
                <a href="https://pubmed.ncbi.nlm.nih.gov/40474076/">
                    Mutual suppression between mutations in the <i>Dictyostelium</i> Greenbeard
                    pathway restores wild-type development
                </a>
            </Reference>
            <Reference
                authors="Katoh-Kurasawa M, Hrovatin K, Hirose S, Webb A, Ho H, Zupan B, Shaulsky G"
                source="Genome Research 2021"
            >
                <a href="https://pubmed.ncbi.nlm.nih.gov/34183452/">
                    Transcriptional milestones in <i>Dictyostelium</i> development
                </a>
            </Reference>
            <Reference
                authors="Swatson WS, Katoh-Kurasawa M, Shaulsky G, Alexander S"
                source="PLoS One 2017"
            >
                <a href="https://preview.ncbi.nlm.nih.gov/pmc/articles/PMC5685611/">
                    Curcumin affects gene expression and reactive oxygen species via a PKA dependent
                    mechanism in <i>Dictyostelium discoideum</i>
                </a>
            </Reference>
            <Reference
                authors="Rosengarten RD, Santhanam B, Kokosar J, Shaulsky G"
                source="Genes|Genomes|Genetics (G3) 2017"
            >
                <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5295588/">
                    The long noncoding RNA transcriptome of <i>Dictyostelium discoideum</i>{' '}
                    development
                </a>
            </Reference>
            <Reference
                authors="Katoh-Kurasawa M, Santhanam B, Shaulsky G"
                source="Journal of Cell Science 2016"
            >
                <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4852770/">
                    The GATA transcription factor gene gtaG is required for terminal differentiation
                    in <i>Dictyostelium</i>
                </a>
            </Reference>
            <Reference
                authors="Chen X, Köllner TG, Jia Q, Norris A, Santhanam B, Rabe P, Dickschat JS, Shaulsky G, Gershenzon J, Chen F"
                source="PNAS 2016"
            >
                <a href="https://www.ncbi.nlm.nih.gov/pubmed/27790999">
                    Terpene synthase genes in eukaryotes beyond <br />
                    plants and fungi: Occurrence in social amoebae
                </a>
            </Reference>
            <Reference
                authors="Rosengarten RD, Santhanam B, Fuller D, Katoh-Kurasawa M, Loomis WF, Zupan B, Shaulsky G"
                source="BMC Genomics 2015"
            >
                <a href="https://bmcgenomics.biomedcentral.com/articles/10.1186/s12864-015-1491-7">
                    Leaps and lulls in the developmental transcriptome of{' '}
                    <i>Dictyostelium discoideum</i>
                </a>
            </Reference>
            <Reference
                authors="Hirose S, Santhanam B, Katoh-Kurasawa M, Shaulsky G, Kuspa A"
                source="Development 2015"
            >
                <a href="https://pubmed.ncbi.nlm.nih.gov/26395484/">
                    Allorecognition, via TgrB1 and TgrC1, mediates the transition from
                    unicellularity to multicellularity in the social amoeba{' '}
                    <i>Dictyostelium discoideum</i>
                </a>
            </Reference>
            <Reference
                authors="Santhanam B, Cai H, Devreotes PN, Shaulsky G, Katoh-Kurasawa M"
                source="Nature Communications 2015"
            >
                <a href="https://www.ncbi.nlm.nih.gov/pubmed/26144553">
                    The GATA transcription factor GtaC regulates early developmental gene expression
                    dynamics in <i>Dictyostelium</i>
                </a>
            </Reference>
            <Reference
                authors="Parikh A, Miranda ER, Katoh-Kurasawa M, Fuller D, Rot G, Zagar L, Curk T, Sucgang R, Chen R, Zupan B, Loomis WF, Kuspa A, Shaulsky G"
                source="Genome Biology 2010"
            >
                <a href="http://genomebiology.com/2010/11/3/R35">
                    Conserved developmental transcriptomes <br /> in evolutionary divergent species
                </a>
            </Reference>
            <Reference
                authors="Rot G, Parikh A, Curk T, Kuspa A, Shaulsky G, Zupan B"
                source="BMC Bioinformatics 2009"
            >
                <a href="http://www.biomedcentral.com/1471-2105/10/265">
                    dictyExpress: A <i>Dictyostelium discoideum</i> gene expression database with an
                    explorative data analysis web-based interface
                </a>
            </Reference>
        </ReferencesContainer>
    </SectionContentContainer>
);

export default References;
