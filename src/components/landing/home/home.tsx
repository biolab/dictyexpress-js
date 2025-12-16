import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import {
    HomeContainer,
    HomeWrapper,
    HomeRunDictyButton,
    HomeDescription,
    HomeDemo,
} from './home.styles';
import dictyLogo from 'images/logo_dicty.1.png';
import dictyDemo1 from 'images/main-ss1.png';
import dictyDemo2 from 'images/main-ss2.png';
import { SectionContentContainer } from 'components/landing/common/layout.styles';
import { Version } from 'components/common/version';

const Home = (): ReactElement => (
    <HomeContainer id="home">
        <SectionContentContainer>
            <HomeWrapper>
                <HomeDescription>
                    <section className="title">
                        <img src={dictyLogo} className="logo" alt="dictyExpress logo" />
                        <h1 className="header">{import.meta.env.VITE_APP_NAME}</h1>
                        <Version />
                    </section>
                    <p>
                        An interactive, exploratory data analytics web-app that provides access to
                        gene expression experiments in <i>Dictyostelium</i> by Baylor College of
                        Medicine.
                    </p>
                    <p style={{ fontSize: '1.3rem' }}>
                        This website is free and open to all users and there is no login
                        requirement.
                    </p>
                    <p>
                        <HomeRunDictyButton variant="outlined" role="button" name="enter-app">
                            <Link to="/bcm/">Run dictyExpress</Link>
                        </HomeRunDictyButton>
                    </p>
                </HomeDescription>
                <HomeDemo>
                    <img src={dictyDemo1} alt="Expression Time Series demo" />
                    <img src={dictyDemo2} alt="Gene Ontology Enrichment" />
                </HomeDemo>
            </HomeWrapper>
        </SectionContentContainer>
    </HomeContainer>
);

export default Home;
