import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

def preprocess_data(df, window_size=3):
    """
    Preprocess electricity consumption data
    - Convert timestamp
    - Extract hour feature
    - Apply moving average smoothing
    """

    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')

    # Feature extraction
    df['hour'] = df['timestamp'].dt.hour

    # Moving average smoothing
    df['smoothed_consumption'] = (
        df['consumption']
        .rolling(window=window_size)
        .mean()
    )

    df.dropna(inplace=True)
    return df


def filter_evening_hours(df, start_hour=18, end_hour=22):
    """
    Filter evening peak hours (default: 6 PM – 10 PM)
    """
    return df[(df['hour'] >= start_hour) & (df['hour'] <= end_hour)]


def train_linear_regression(df, days=7):
    """
    Train linear regression model using past week data
    """
    samples_per_day = 5  # 6 PM to 10 PM
    last_week = df.tail(days * samples_per_day)

    X = last_week[['hour']]
    y = last_week['smoothed_consumption']

    model = LinearRegression()
    model.fit(X, y)

    return model


def predict_evening_peak(model):
    """
    Predict electricity consumption for next evening peak hours
    """
    future_hours = pd.DataFrame({
        'hour': [18, 19, 20, 21, 22]
    })

    predictions = model.predict(future_hours)
    future_hours['predicted_consumption'] = predictions

    return future_hours
