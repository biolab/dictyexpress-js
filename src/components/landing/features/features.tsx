import React, { ReactElement } from 'react';
import { FeaturesWrapper } from './features.styles';
import Feature from './feature';
import timeSeriesImage from 'images/feature1.png';
import dendrogramImage from 'images/feature2.png';
import dnkImage from 'images/feature3.png';
import mouseClickImage from 'images/feature4.png';
import { Title } from 'components/landing/common/title.styles';
import { SectionContentContainer } from 'components/landing/common/layout.styles';
import SectionNames from 'components/landing/common/constants';

const Features = (): ReactElement => (
    <SectionContentContainer id={SectionNames.FEATURES}>
        <Title>Features</Title>
        <FeaturesWrapper>
            <Feature imageSrc={timeSeriesImage} name="Time series">
                Plot and explore RNA-seq gene expressions of <i>D. discoideum</i> and{' '}
                <i>D. purpureum</i>
            </Feature>
            <Feature imageSrc={dendrogramImage} name="Dendrogram">
                Explore how gene expression changes across developmental time points at single-cell
                resolution
            </Feature>
            <Feature imageSrc={dnkImage} name="DNK">
                Compare gene expression across different strains and explore cell-type specific
                expressions
            </Feature>
            <Feature imageSrc={mouseClickImage} name="Mouse click">
                Interactive design with clickable plots where selections propagate to other modules
            </Feature>
        </FeaturesWrapper>
    </SectionContentContainer>
);

export default Features;
