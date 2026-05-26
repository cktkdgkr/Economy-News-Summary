package com.example.economynews.services

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class EconomyFcmService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        Log.d(TAG, "FCM data received: keys=${message.data.keys}")
        // T-A04에서 IngestDigestUseCase 연결 예정
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "FCM token refreshed")
    }

    companion object {
        private const val TAG = "EconomyFcmService"
    }
}
