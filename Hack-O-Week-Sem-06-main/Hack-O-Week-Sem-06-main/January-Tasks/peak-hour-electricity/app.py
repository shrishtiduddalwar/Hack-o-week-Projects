import streamlit as st
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import plotly.graph_objects as go

st.set_page_config(page_title="Electricity Peak Prediction", layout="wide")

st.title("Peak Hour Electricity Spike Prediction Dashboard")

# Upload data
uploaded_file = st.file_uploader("Upload Hourly Electricity Data (CSV)", type="csv")

if uploaded_file:
    df = pd.read_csv(uploaded_file)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')

    # Feature engineering
    df['hour'] = df['timestamp'].dt.hour

    # Moving average smoothing
    df['smoothed_consumption'] = df['consumption'].rolling(window=3).mean()
    df.dropna(inplace=True)

    # Filter evening peak hours
    evening_df = df[(df['hour'] >= 18) & (df['hour'] <= 22)]

    # Train on last 7 days
    last_week = evening_df.tail(35)  # 5 hrs × 7 days
    X = last_week[['hour']]
    y = last_week['smoothed_consumption']

    model = LinearRegression()
    model.fit(X, y)

    # Predict next evening
    future_hours = pd.DataFrame({'hour': [18, 19, 20, 21, 22]})
    predictions = model.predict(future_hours)
    future_hours['predicted_consumption'] = predictions

    # Visualization
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=evening_df['timestamp'],
        y=evening_df['consumption'],
        mode='lines',
        name='Actual Consumption'
    ))

    fig.add_trace(go.Scatter(
        x=evening_df['timestamp'],
        y=evening_df['smoothed_consumption'],
        mode='lines',
        name='Smoothed Consumption'
    ))

    fig.add_trace(go.Scatter(
        x=future_hours['hour'],
        y=future_hours['predicted_consumption'],
        mode='lines+markers',
        name='Predicted Evening Peak',
        line=dict(dash='dash')
    ))

    fig.update_layout(
        title="Evening Peak Electricity Usage Forecast",
        xaxis_title="Time / Hour",
        yaxis_title="Consumption (kWh)",
        template="plotly_dark"
    )

    st.plotly_chart(fig, use_container_width=True)

    # Display prediction table
    st.subheader("🔮 Predicted Peak Hour Consumption")
    st.dataframe(future_hours)

else:
    st.info("📤 Upload a CSV file to start analysis")
