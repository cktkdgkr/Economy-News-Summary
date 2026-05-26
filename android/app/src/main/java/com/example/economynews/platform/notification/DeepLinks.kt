package com.example.economynews.platform.notification

object DeepLinks {
    const val SCHEME = "economynews"
    const val HOST_DIGEST = "digest"

    // economynews://digest/{date}
    fun digestUri(dateKst: String): String = "$SCHEME://$HOST_DIGEST/$dateKst"
}
