import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import matplotlib.pyplot as plt

# Load dataset
df = pd.read_csv("classroom_usage_large.csv")

# Convert timestamp
df['timestamp'] = pd.to_datetime(df['timestamp'])
df.set_index('timestamp', inplace=True)

# Target variable
y = df['electricity_kw']

# Train ARIMA model
# (p=2, d=1, q=2 works well for hourly consumption trends)
model = ARIMA(y, order=(2, 1, 2))
model_fit = model.fit()

# Forecast next 1 hour
forecast = model_fit.get_forecast(steps=1)

# Mean prediction
predicted_value = forecast.predicted_mean.iloc[0]

# Confidence interval
conf_int = forecast.conf_int(alpha=0.05)

print("Next-hour electricity prediction (kW):", round(predicted_value, 2))
print("95% Confidence Interval:")
print(conf_int)

# Plot
plt.figure(figsize=(8,4))
plt.plot(y[-24:], label="Last 24 hours")
plt.scatter(y.index[-1] + pd.Timedelta(hours=1), predicted_value, color='red', label="Forecast")
plt.fill_between(
    [y.index[-1] + pd.Timedelta(hours=1)],
    conf_int.iloc[:, 0],
    conf_int.iloc[:, 1],
    color='pink',
    alpha=0.3
)
plt.legend()
plt.title("Next-Hour Classroom Electricity Forecast")
plt.xlabel("Time")
plt.ylabel("kW")
plt.show()
