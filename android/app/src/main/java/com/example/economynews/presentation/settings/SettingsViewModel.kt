package com.example.economynews.presentation.settings

import android.Manifest
import android.app.Application
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class SettingsUiState(
    val permissionGranted: Boolean,
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    application: Application,
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(SettingsUiState(permissionGranted = checkPermission()))
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    fun refresh() {
        _uiState.value = SettingsUiState(permissionGranted = checkPermission())
    }

    private fun checkPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            getApplication(),
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }
}
