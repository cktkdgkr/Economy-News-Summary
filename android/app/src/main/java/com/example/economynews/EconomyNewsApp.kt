package com.example.economynews

import android.app.Application
import android.util.Log
import com.example.economynews.domain.port.DigestRepository
import com.example.economynews.platform.notification.NotificationChannels
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class EconomyNewsApp : Application() {

    @Inject lateinit var repository: DigestRepository

    override fun onCreate() {
        super.onCreate()
        NotificationChannels.create(this)
        FirebaseMessaging.getInstance().subscribeToTopic("economy-news")
            .addOnCompleteListener { task ->
                val msg = if (task.isSuccessful) "FCM topic subscribed" else "FCM topic subscription failed"
                Log.d("EconomyNewsApp", msg)
            }
        CoroutineScope(Dispatchers.IO).launch {
            repository.purgeOlderThan(31)
        }
    }
}
