Hourly Electricity Consumption Forecasting with LSTM
Project Overview
This project aims to forecast hourly electricity consumption (kWh) using a Long Short-Term Memory (LSTM) Recurrent Neural Network. The model is trained on historical data to identify temporal patterns and provide accurate demand predictions, which are then visualized in an interactive dashboard.

Features
Data Preprocessing: Handles time-series sequencing, feature scaling, and categorical encoding for day types.
LSTM Architecture: Implements a many-to-one RNN architecture using TensorFlow/Keras to capture hourly dependencies.
Interactive Dashboard: Built with ipywidgets and Matplotlib/Seaborn to allow users to filter predictions by day type (Regular Weekday, Event Day, Weekend).
Inverse Transformation: Ensures that model outputs are converted back to the original kWh scale for practical interpretation.
Workflow
Data Loading: Import consumption data from CSV.
Feature Engineering: Create lags, rolling averages, and encode event-based flags.
Sequence Preparation: Reshape data into [samples, time steps, features] format.
Model Training: Train an LSTM model with Dropout to prevent overfitting.
Evaluation: Compare predicted vs. actual values on a hold-out test set.
Visualization: Interactive filtering to analyze consumption patterns during and after events.
How to Use
Run all cells in the notebook to train the model.
Navigate to the 'Create Interactive Dashboard' section.
Use the dropdown menu to select a specific Day_Type to view the forecast performance for that category.
