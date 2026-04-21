import React, { ReactElement } from 'react';
import { CreditsLogos } from './credits.styles';
import SectionNames from 'components/landing/common/constants';
import {
    SectionContentContainer,
    DarkSectionContainer,
} from 'components/landing/common/layout.styles';
import { Title } from 'components/landing/common/title.styles';
import baylorLogo from 'images/bcmLogo.png';
import friLogo from 'images/ulfriLogo.png';
import genialisLogo from 'images/genialisLogo.png';

const Credits = (): ReactElement => (
    <DarkSectionContainer>
        <SectionContentContainer id={SectionNames.CREDITS} $centerText>
            <Title>Credits</Title>
            <p>
                dictyExpress is maintained by the{' '}
                <a href="http://www.biolab.si">
                    Bioinformatics Laboratory at University of Ljubljana
                </a>{' '}
                (application development) and{' '}
                <a href="https://www.bcm.edu/people/view/b17c52a8-ffed-11e2-be68-080027880ca6">
                    Gad Shaulsky’s lab at Baylor College of Medicine
                </a>{' '}
                (data). We thank <a href="http://www.genialis.com">Genialis</a> and Adam Kuspa’s lab
                at Baylor College of Medicine for their contributions to the original design and
                implementation.
            </p>
            <CreditsLogos>
                <a href="https://www.bcm.edu/">
                    <img src={baylorLogo} alt="Baylor College of Medicine" />
                </a>
                <a href="http://www.fri.uni-lj.si/">
                    <img src={friLogo} alt="University of Ljubljana" />
                </a>
                <a href="http://www.genialis.com/">
                    <img src={genialisLogo} alt="Genialis" />
                </a>
            </CreditsLogos>
        </SectionContentContainer>
    </DarkSectionContainer>
);

export default Credits;
