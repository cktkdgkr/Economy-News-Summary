package com.example.economynews.platform.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import com.example.economynews.presentation.common.ConnectivityState
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConnectivityObserver @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    fun observe(): Flow<ConnectivityState> = callbackFlow {
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { trySend(ConnectivityState.Online) }
            override fun onLost(network: Network) { trySend(ConnectivityState.Offline) }
        }
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        cm.registerNetworkCallback(request, callback)

        val active = cm.activeNetwork
        val caps = cm.getNetworkCapabilities(active)
        val initial = if (caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true) {
            ConnectivityState.Online
        } else {
            ConnectivityState.Offline
        }
        trySend(initial)

        awaitClose { cm.unregisterNetworkCallback(callback) }
    }
}
