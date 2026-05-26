# Hilt
-keep,allowobfuscation,allowshrinking class dagger.hilt.** { *; }
-keep,allowobfuscation,allowshrinking class javax.inject.** { *; }
-keep,allowobfuscation,allowshrinking @dagger.hilt.android.HiltAndroidApp class * { *; }
-keep,allowobfuscation,allowshrinking @dagger.hilt.android.AndroidEntryPoint class * { *; }
-keep,allowobfuscation,allowshrinking @dagger.hilt.InstallIn class * { *; }

# Room
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao interface * { *; }

# kotlinx-serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keep,includedescriptorclasses class com.example.economynews.**$$serializer { *; }
-keepclassmembers class com.example.economynews.** {
    *** Companion;
}

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Compose
-dontwarn androidx.compose.**

# Model classes
-keep class com.example.economynews.domain.model.** { *; }
-keep class com.example.economynews.data.local.* { *; }
