package com.example.economynews.presentation.common

sealed interface ConnectivityState {
    data object Online : ConnectivityState
    data object Offline : ConnectivityState
}
