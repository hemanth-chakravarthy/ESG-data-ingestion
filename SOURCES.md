# Data Sources & Formats (SOURCES.md)

This document details the real-world research and design decisions behind the three data sources ingested by the platform.

---

## 1. SAP Fuel & Procurement Data

*   **Real-World Research**: SAP data is commonly exported via IDoc flat files, BAPI tables, or OData services. Fields in SAP systems are notorious for having German database names (e.g. `MENGE` for quantity, `MEINS` for unit) and cryptic plant/warehouse codes.
*   **Sample Data Design**: Our sample data represents a procurement report containing:
    *   `fuel_type` (e.g. Diesel, Natural Gas, Petrol)
    *   `quantity` (numerical fuel amount)
    *   `unit` (liters, gallons, cubic meters)
    *   `date` (transaction timestamps)
    *   `plant_code` (e.g., PL-042)
*   **What Would Break in Production**: 
    *   **Plant Mappings**: Without an organization-specific lookup table, we cannot resolve plant codes (e.g., PL-042) to physical addresses, making regional emission factor mapping impossible.
    *   **Unit Inconsistency**: Conversions between volumetric (liters) and energy units (kWh/Joules) require material-specific density factors.

---

## 2. Utility Electricity Data

*   **Real-World Research**: Facilities teams usually download CSV files from utility provider portals (e.g., PG&E, National Grid) or parse utility bills. These files contain meter readings, billing periods, and tariffs.
*   **Sample Data Design**: Simulates a portal CSV export:
    *   `meter_type` (electricity, gas)
    *   `consumption` (numerical value)
    *   `unit` (kWh, therms)
    *   `billing_date` (often containing offset date ranges)
    *   `meter_number` (unique identifier)
*   **What Would Break in Production**:
    *   **Billing Period Overlap**: Billings rarely align with calendar months (e.g. billing from Oct 14 to Nov 12). A production engine must split and distribute consumption proportionally across calendar months.
    *   **Dynamic CSV Headers**: Utility companies frequently change their portal export structures, breaking static parsers.

---

## 3. Corporate Travel (Concur/Navan)

*   **Real-World Research**: Travel portals (like Concur or Navan) expose booking lists containing travel segments, costs, and flight details. They rarely provide travel distances; instead, they list IATA airport codes (e.g., JFK, LHR).
*   **Sample Data Design**:
    *   `booking_type` (flight, hotel, rail, taxi)
    *   `passenger_name` (employee name)
    *   `departure_date` (date of travel)
    *   `expense_amount` & `currency` (cost details)
    *   `departure_airport` & `arrival_airport` (IATA airport codes)
*   **What Would Break in Production**:
    *   **Distance Calculations**: Airport codes require a lookup database (Great Circle Distance formula) to calculate flight mileage.
    *   **Currency Conversion**: Financial cost is a poor proxy for carbon emissions. If direct travel distance is missing, relying on cost is highly subject to pricing inflation and exchange rate fluctuations.
