import streamlit as st
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import plotly.graph_objects as go


df = pd.read_csv("library_energy_exam_dataset.csv")
df['date'] = pd.to_datetime(df['date'])
df.set_index('date', inplace=True)

energy = df['energy_kwh']

model = ExponentialSmoothing(energy, trend='add')
model_fit = model.fit()

forecast = model_fit.forecast(30)
semester_total = forecast.sum()

fig = go.Figure(go.Indicator(
    mode="gauge+number",
    value=semester_total,
    title={'text': "Semester-End Energy Forecast (kWh)"},
    gauge={
        'axis': {'range': [0, 20000]},
        'bar': {'color': "orange"},
        'steps': [
            {'range': [0, 12000], 'color': "lightgreen"},
            {'range': [12000, 16000], 'color': "yellow"},
            {'range': [16000, 20000], 'color': "red"}
        ],
    }
))

st.title("Library Energy Usage Forecast During Exams")
st.plotly_chart(fig)
