package com.example.economynews

import android.app.Application
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class EconomyNewsApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseMessaging.getInstance().subscribeToTopic("economy-news")
            .addOnCompleteListener { task ->
                val msg = if (task.isSuccessful) "FCM topic subscribed" else "FCM topic subscription failed"
                Log.d("EconomyNewsApp", msg)
            }
    }
}
