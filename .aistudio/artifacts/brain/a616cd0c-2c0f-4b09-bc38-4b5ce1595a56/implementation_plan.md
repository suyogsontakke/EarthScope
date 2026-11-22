# Mobile Responsiveness Optimization Plan

## Objective
Optimize the EarthScope application for mobile devices, focusing on navigation and data table readability as per user feedback.

## Implementation Details

### 1. Navigation (Sidebar)
*   **Modify `DashboardLayout.tsx`**: Add `mobileSidebarOpen` state to manage overlay visibility on smaller screens.
*   **Modify `Header.tsx`**: Introduce a hamburger menu icon visible only on screens below 1024px, which toggles the sidebar state in the layout.
*   **Modify `Sidebar.tsx`**: Adjust styling to function as an overlay/drawer on mobile when triggered, maintaining desktop-style static rendering on larger screens (`lg:` breakpoint).

### 2. Table Readability
*   **Target Pages**: `TrendDetective.tsx`, `LocationComparison.tsx`, and any other pages containing large data tables.
*   **Action**: Wrap all `<table>` elements in a `div` with the class `overflow-x-auto`. This ensures tables can be scrolled horizontally within the container without overflowing the viewport width.

## Verification
*   Compile the applet to ensure no breaking changes.
*   Test navigation flow on simulated mobile/tablet screen sizes.
*   Verify horizontal scrolling behavior on data-heavy tables.
