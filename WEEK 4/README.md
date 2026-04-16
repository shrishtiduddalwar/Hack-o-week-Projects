# Cafeteria Load Prediction Using Weather Data and WebSockets

## Overview

This project predicts **cafeteria crowd surges during lunch hours** using a machine learning model. The system analyzes factors such as **time of day, temperature, and weather conditions** to estimate how many people are likely to visit the cafeteria at a given time.

The model is built using **Linear Regression** and predictions are streamed in real time using **WebSocket**. A live chart updates continuously to visualize predicted cafeteria load.

This project demonstrates how machine learning can be integrated with real-time data streaming to help organizations manage resources more efficiently.

---

## Problem Statement

Cafeterias often experience **sudden spikes in customer traffic**, especially during lunch hours. These surges can lead to:

* Long waiting times
* Food shortages
* Overcrowding
* Inefficient staff allocation

The goal of this project is to **predict these surges in advance** so that cafeteria management can prepare accordingly.

---

## Objectives

* Predict cafeteria crowd size based on environmental and time-based factors
* Identify potential **lunch-hour surges**
* Stream predictions in real time
* Visualize predicted load using a live updating chart

---

## Technologies Used

* Python
* **Google Colab**
* Pandas (data manipulation)
* NumPy (numerical computation)
* Matplotlib (data visualization)
* Scikit-learn (machine learning)
* **WebSocket** for real-time communication

---

## Machine Learning Model

The project uses **Linear Regression** to predict cafeteria load.

### Input Features

* Hour of the day
* Temperature
* Rain condition (0 = No rain, 1 = Rain)

### Output

* Predicted number of people in the cafeteria

The model learns the relationship between these features and cafeteria crowd levels.

---

## Dataset

Since real cafeteria data was not available, a **synthetic dataset** was generated. The dataset simulates realistic patterns such as:

* Higher crowd during lunch hours
* Weather affecting cafeteria attendance
* Random variations to simulate real-world conditions

Example structure:

| Hour | Temperature | Rain | Cafeteria Load |
| ---- | ----------- | ---- | -------------- |
| 10   | 29          | 0    | 85             |
| 12   | 31          | 0    | 150            |
| 14   | 30          | 1    | 95             |

---

## System Architecture

1. Dataset generation
2. Model training using Linear Regression
3. WebSocket server generates prediction requests
4. Client receives predictions in real time
5. A live graph visualizes predicted cafeteria load

---

## Real-Time Prediction Flow

1. The server generates simulated real-time data (hour, temperature, rain).
2. The trained model predicts cafeteria load.
3. Predictions are sent through WebSocket communication.
4. The client receives predictions and updates the chart.

This process repeats continuously to simulate **live cafeteria traffic forecasting**.

---

## Output

The system produces:

* Real-time predictions of cafeteria crowd levels
* A continuously updating graph showing load trends

Example prediction:

```
Hour: 12
Temperature: 31°C
Rain: No
Predicted Cafeteria Load: 148 people
```

---

## Applications

This system can help institutions:

* Prepare food quantities in advance
* Optimize staff scheduling
* Reduce waiting times
* Improve cafeteria management efficiency

The same approach can also be applied to:

* Retail store traffic prediction
* Restaurant demand forecasting
* Event crowd management

---

## Future Improvements

Possible enhancements include:

* Using real weather APIs for live data
* Implementing advanced models such as Random Forest or Gradient Boosting
* Building a web dashboard for better visualization
* Deploying the system as a real-time web application

---

## Conclusion

This project demonstrates how machine learning and real-time communication can be combined to predict cafeteria crowd surges. By leveraging **Linear Regression** and **WebSocket streaming**, the system provides continuous predictions that can help cafeteria operators make better operational decisions.
