import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
import time

st.title("Cafeteria Load Prediction")

DATA_PATH = "D:\Hack-O-Week\Jan\Week 4\School_data.csv"

@st.cache_data
def load_data():
    df = pd.read_csv(DATA_PATH)

    # Remove extra spaces
    df.columns = df.columns.str.strip()

    return df

df = load_data()

# Select correct columns from your dataset
df = df[["Hour", "Outdoor Temp (°C)", "Use [kW]"]]

# Filter lunch hours (11 AM to 2 PM)
lunch_df = df[(df["Hour"] >= 11) & (df["Hour"] <= 14)]

# Features and target
X = lunch_df[["Outdoor Temp (°C)"]]
y = lunch_df["Use [kW]"]

# Train Linear Regression model
model = LinearRegression()
model.fit(X, y)

# Predict using latest temperature
latest_temp = df["Outdoor Temp (°C)"].iloc[-1]
predicted_load = model.predict([[latest_temp]])[0]

st.subheader("Predicted Lunch Hour Load")
st.write(round(predicted_load, 2), "kW")

# Real-time updating chart simulation
st.subheader("Real-Time Cafeteria Load Trend")

chart_placeholder = st.empty()
load_series = []

for i in range(20):
    temp_val = df["Outdoor Temp (°C)"].iloc[-(i+1)]
    value = model.predict([[temp_val]])[0]
    load_series.append(value)

    fig = plt.figure()
    plt.plot(load_series)
    plt.xlabel("Time Step")
    plt.ylabel("Predicted Load (kW)")
    plt.title("Live Cafeteria Load Prediction")

    chart_placeholder.pyplot(fig)
    time.sleep(0.5)
