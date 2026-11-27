# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

## [Unreleased]

## 1.3.0

### Added

-   Select cells on the Single-Cell Expression UMAP and rank their marker genes against cells
    from the same time points or all other cells; results open in Differential Expressions.
-   Shared markers across several selected UMAP regions.
-   Marker volcano plot with a detection filter for selection-specific genes.

### Fixed

-   Genes no longer show as unexpressed (grey) on the UMAP after a failed chunk download.

## 1.2.9

### Changed

-   Change the default genes to ecmB, rasD, thyA, cdc20, pcna and ecmF.

## 1.2.8

### Changed

-   Bookmarks now save and restore the Single-Cell Expression settings.

## 1.2.7

### Changed

-   Update tutorial to clear the genes selected on initial load.

## 1.2.6

### Changed

-   Add genes at first load, so dashboard isn't empty.

## 1.2.5

### Changed

-   Update tutorial steps to use new dataset.

## 1.2.4

### Changed

-   Fix GO Enrichment module to clear results when highlighted genes don't change.

## 1.2.3

### Changed

-   Re-implement Find Similar and GO Enrichment modules using the fast API endpoints.

## 1.2.2

### Changed

-   Update landing page with new screenshots and credits.

## 1.2.1

### Added

-   Info modals for all modules.

### Changed

-   UI improvements such as ellipsis for hidden controls.

## 1.2.0

### Added

-   Interactive tutorial for new users.
-   New module for single-cell expression data.

## 1.1.0

### Added

-   Download expression values in Expression time courses module.

### Changed

-   Fetch sample relations only for bcm community.

## 1.0.1

### Fixed

-   Fix connect-src CSP policy to allow connections to _.genialis.io and _.genialis.com.
-   Fix hiding Differential Expressions controls when resizing.

### Changed

-   Set a smaller step for FDR input fields.
