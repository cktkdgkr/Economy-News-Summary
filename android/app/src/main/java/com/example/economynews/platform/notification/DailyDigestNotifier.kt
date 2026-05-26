package com.example.economynews.platform.notification

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.economynews.R
import com.example.economynews.domain.model.DailyDigest
import com.example.economynews.domain.port.NotificationPort
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class DailyDigestNotifier @Inject constructor(
    @ApplicationContext private val context: Context,
) : NotificationPort {

    override suspend fun showDigestNotification(digest: DailyDigest) {
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                return
            }
        }

        val deepLinkUri = Uri.parse(DeepLinks.digestUri(digest.dateKst))
        val intent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, NotificationChannels.DAILY_DIGEST)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("오늘의 경제 뉴스")
            .setContentText(digest.headline)
            .setSubText("원문 ${digest.articleCount}건")
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        NotificationManagerCompat.from(context).notify(
            digest.dateKst.hashCode(),
            notification,
        )
    }
}
