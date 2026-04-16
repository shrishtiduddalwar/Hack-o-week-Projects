Admin Building Usage Analysis: Identifying Profiles, Forecasting, and Savings Potential
Project Overview
This project aims to analyze the energy usage patterns of an admin building to identify distinct usage profiles, forecast future energy consumption for each profile, and quantify potential cost savings through targeted interventions. The analysis leverages K-means clustering for segmentation and Linear Regression for forecasting.

Dataset
The analysis is based on the admin_building_usage.csv dataset, which contains hourly energy consumption data along with contextual information such as:

timestamp: Date and time of the reading
date: Date of the reading
hour: Hour of the day
day_of_week: Day of the week (0=Monday, 6=Sunday)
day_name: Name of the day
month: Month of the year
is_weekend: Binary flag (1 if weekend, 0 otherwise)
total_kwh: Total energy consumption in kWh
hvac_kwh: HVAC energy consumption in kWh
lighting_kwh: Lighting energy consumption in kWh
equipment_kwh: Equipment energy consumption in kWh
occupancy: Building occupancy level
temperature_c: Temperature in Celsius
humidity_pct: Humidity percentage
Methodology
1. Data Loading
The admin_building_usage.csv dataset was loaded into a pandas DataFrame for initial inspection and processing.

2. Data Preprocessing for Clustering
To prepare the data for K-means clustering, the following steps were performed:

Feature Selection: The following features were selected as relevant for defining usage profiles: 'total_kwh', 'hvac_kwh', 'lighting_kwh', 'equipment_kwh', 'hour', 'day_of_week', 'is_weekend', 'month', 'occupancy', 'temperature_c', 'humidity_pct'.
Missing Value Check: No missing values were found in the selected features, eliminating the need for imputation.
Data Scaling: The selected features were scaled using StandardScaler to ensure that all features contribute equally to the clustering process, preventing features with larger numerical ranges from dominating the distance calculations.
3. Determine Optimal Clusters (Elbow Method)
The Elbow Method was applied to the scaled data to identify the optimal number of clusters (k) for K-means. The inertia (sum of squared distances of samples to their closest cluster center) was calculated for a range of k values (1 to 10). The plot showed a distinct 'elbow' at k=4, indicating that 4 is the optimal number of clusters.

4. Apply K-Means Clustering
K-means clustering was applied with optimal_k = 4 to segment the building usage data. Each data point was assigned a cluster label, which was then added as a new cluster column to the original DataFrame.

5. Analyze Usage Profiles
The characteristics of each identified cluster were analyzed by calculating the mean of the selected features for each cluster. This provided a clear understanding of the distinct usage patterns:

Cluster 1 (Primary Operational): Highest energy consumption (mean 150.66 kWh total), highest occupancy (94.35), occurring predominantly on weekdays during typical working hours (~11.96 hour). This cluster represents the most intensive usage period.
Cluster 0 (Weekend Usage): Moderate energy consumption (mean 44.20 kWh total) and lower occupancy (8.30), exclusively identified as weekend usage.
Cluster 2 (Evening/After-hours): Moderate energy consumption (mean 62.08 kWh total) and occupancy (17.27) during weekdays, but in later hours (~20.11 hour).
Cluster 3 (Baseline/Early Morning): Lowest energy consumption (mean 51.33 kWh total) and occupancy (11.16) during very early weekday mornings (~3.49 hour), suggesting a baseline or unoccupied profile.
6. Develop Regression Models for Forecasts
For each of the four identified clusters, a separate Linear Regression model was developed to forecast total_kwh. The data for each cluster was split into 80% training and 20% testing sets. The following features were used for forecasting: 'hour', 'day_of_week', 'is_weekend', 'month', 'occupancy', 'temperature_c', 'humidity_pct'.

7. Model Evaluation
The performance of each Linear Regression model was evaluated using the R-squared score on its respective test set:

Cluster 0: R-squared: 0.4720
Cluster 3: R-squared: 0.7445
Cluster 1: R-squared: 0.2413
Cluster 2: R-squared: 0.6983
8. Calculate Savings Potential
Potential savings were calculated by assuming a 10% reduction in the forecasted total_kwh for each cluster. Negative predictions were set to zero to ensure realistic savings calculations.

Potential Savings per Cluster:
Cluster 0: 6638.84 kWh
Cluster 3: 6238.70 kWh
Cluster 1: 22782.33 kWh
Cluster 2: 6433.18 kWh
Total Potential Savings: 42093.05 kWh
9. Visualize Savings Potential
A pie chart was generated to visualize the distribution of potential savings across the clusters, providing a clear and dashboard-friendly representation of where the most significant savings can be achieved. The chart included percentage distribution and actual kWh savings for clarity.

Key Findings
Identified Usage Profiles: Four distinct building usage profiles were identified, each with unique characteristics related to time, day, occupancy, and energy consumption components.
Forecasting Performance: Regression models showed varying predictive power, with Cluster 3 and Cluster 2 models performing relatively well, while Cluster 1 and Cluster 0 had lower R-squared scores.
Significant Savings: A total potential savings of 42,093.05 kWh was estimated based on a 10% reduction target.
Targeted Opportunities: Cluster 1 (Primary Operational) represents the largest opportunity for savings, contributing over half of the total potential savings.
Insights and Next Steps
Prioritize Cluster 1: Given its highest energy consumption and largest savings potential, optimization efforts should be primarily focused on the Primary Operational profile (Cluster 1).
Improve Model Accuracy: Further investigation is needed to enhance the R-squared scores for Cluster 1 and Cluster 0. This could involve:
Incorporating additional predictive features (e.g., holiday indicators, special events, weather forecasts).
Exploring more advanced time-series forecasting models (e.g., ARIMA, Prophet, or recurrent neural networks) that can better capture temporal dependencies.
Feature engineering for the existing variables.
Deep Dive into Profiles: A more in-depth analysis of the factors driving consumption within each cluster, especially Cluster 1, could reveal specific areas for intervention (e.g., optimizing HVAC schedules, lighting control strategies during peak hours).
Cost Analysis: Convert kWh savings into monetary savings to provide a clearer business case for energy efficiency investments.
