import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    min-width: 360px;
    padding-top: 0px;
    font-family: "FS Joey Web Regular",Helvetica,Arial,Verdana,sans-serif;
    font-size: 1rem;
    font-style: normal;
    font-weight: normal;
  }

  h1 {
    font-family: "FS Joey Web Bold",Helvetica,Arial,Verdana,sans-serif;
    font-size: 4rem;
    margin-top: 10px;
    margin-bottom:20px;
  }

  h2, h3, h4, h5, h6 {
    font-family: "FS Joey Web Regular",Helvetica,Arial,Verdana,sans-serif;
    margin-top: 20px;
    margin-bottom: 10px;
  }

  p {
    font-size: 1.3rem;
    line-height: 1.2em;
    margin: 0 0 10px;
  }

  a {
    color: #428bca;
    text-decoration: none;
  }

  /* Tutorial highlight for rows and inputs */
  .tutorial-highlight-row {
    background: linear-gradient(90deg, rgba(25, 118, 210, 0.08) 0%, rgba(25, 118, 210, 0.04) 100%) !important;
    box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 0.6), 0 0 8px rgba(25, 118, 210, 0.3);
    position: relative;
    animation: tutorial-row-glow 1.5s ease-in-out infinite;
    cursor: pointer !important;
    border-radius: 4px;
  }

  .tutorial-highlight-row:hover {
    background: linear-gradient(90deg, rgba(25, 118, 210, 0.15) 0%, rgba(25, 118, 210, 0.10) 100%) !important;
    box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 0.8), 0 0 12px rgba(25, 118, 210, 0.4);
  }

  /* Override border-radius for AG Grid rows which are rectangular */
  .ag-row.tutorial-highlight-row {
    border-radius: 0;
  }

  @keyframes tutorial-row-glow {
    0%, 100% {
      box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 0.6), 0 0 8px rgba(25, 118, 210, 0.3);
    }
    50% {
      box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 1), 0 0 16px rgba(25, 118, 210, 0.5);
    }
  }

  /* Tutorial highlight for dropdown menu items */
  .tutorial-highlight-menu-item {
    background: linear-gradient(90deg, rgba(25, 118, 210, 0.15) 0%, rgba(25, 118, 210, 0.08) 100%) !important;
    box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 0.7);
    animation: tutorial-menu-item-glow 1.5s ease-in-out infinite;
    border-radius: 4px;
    position: relative;
  }

  .tutorial-highlight-menu-item:hover {
    background: linear-gradient(90deg, rgba(25, 118, 210, 0.25) 0%, rgba(25, 118, 210, 0.15) 100%) !important;
    box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 1);
  }

  @keyframes tutorial-menu-item-glow {
    0%, 100% {
      box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 0.7), 0 0 6px rgba(25, 118, 210, 0.3);
    }
    50% {
      box-shadow: inset 0 0 0 2px rgba(25, 118, 210, 1), 0 0 12px rgba(25, 118, 210, 0.5);
    }
  }

  /* Tutorial button hint - deep blue text with animated glow */
  .tutorial-button-hint {
    color: #49688d !important;
    font-weight: 600 !important;
    animation: tutorial-text-glow 1.8s ease-in-out infinite;
  }

  @keyframes tutorial-text-glow {
    0%, 100% {
      text-shadow: 0 0 4px rgba(73, 104, 141, 0.4);
    }
    50% {
      text-shadow: 0 0 8px rgba(73, 104, 141, 0.7), 0 0 16px rgba(73, 104, 141, 0.4);
    }
  }
`;

export const breakpoints = {
    small: 768,
    mid: 992,
    large: 1200,
};

export const appBarHeight = 56;
