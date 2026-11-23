package com.precisionslate.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.Lifecycle
import com.precisionslate.mobile.data.AccountCard
import com.precisionslate.mobile.data.AccountDraft
import com.precisionslate.mobile.data.ApiFailure
import com.precisionslate.mobile.data.ConnectionRequiredException
import com.precisionslate.mobile.data.DevicePreferences
import com.precisionslate.mobile.data.LocalDatabase
import com.precisionslate.mobile.data.MobileRepository
import java.io.IOException
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private lateinit var repository: MobileRepository
    private lateinit var preferences: DevicePreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        preferences = DevicePreferences(applicationContext)
        val database = LocalDatabase.create(applicationContext)
        repository = MobileRepository(database, preferences)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    MobileApp(repository, preferences)
                }
            }
        }
    }
}

private enum class Page {
    SERVER_URL,
    LOGIN,
    HOME,
    ADD_ACCOUNT,
}

@Composable
private fun MobileApp(repository: MobileRepository, preferences: DevicePreferences) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    var page by remember {
        mutableStateOf(
            when {
                preferences.serverUrl.isBlank() -> Page.SERVER_URL
                preferences.token() == null -> Page.LOGIN
                else -> Page.HOME
            },
        )
    }
    var status by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var accountCards by remember { mutableStateOf(emptyList<AccountCard>()) }
    var queuedCount by remember { mutableStateOf(0) }

    suspend fun updateHome() {
        accountCards = repository.accounts()
        queuedCount = repository.pendingCount()
    }

    suspend fun refreshHome() {
        repository.refresh()
        updateHome()
    }

    fun launchAction(action: suspend () -> Unit) {
        scope.launch {
            busy = true
            status = ""
            try {
                action()
                if (page == Page.HOME) updateHome()
            } catch (_: ConnectionRequiredException) {
                status = "Connection required to complete this."
            } catch (failure: ApiFailure) {
                status = "The server rejected the request (HTTP ${failure.status})."
            } catch (failure: IOException) {
                status = "Network or temporary server error; retry when connected."
            } catch (failure: IllegalArgumentException) {
                status = failure.message ?: "Check the entered values."
            } finally {
                busy = false
            }
        }
    }

    LaunchedEffect(page) {
        if (page == Page.HOME) {
            try {
                repository.authenticateExistingSession()
                updateHome()
            } catch (failure: ApiFailure) {
                status = "The saved device session is no longer valid (HTTP ${failure.status})."
                preferences.clearToken()
                page = Page.LOGIN
            } catch (failure: IOException) {
                status = "Network or temporary server error; cached accounts remain available."
                updateHome()
            }
        }
    }

    LaunchedEffect(page) {
        if (page == Page.HOME) {
            lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (isActive) {
                    delay(15_000)
                    try {
                        refreshHome()
                        status = ""
                    } catch (failure: ApiFailure) {
                        status = "Sync request failed (HTTP ${failure.status})."
                    } catch (failure: IOException) {
                        status = "Network or temporary server error; queued writes will retry."
                    }
                }
            }
        }
    }

    when (page) {
        Page.SERVER_URL -> ServerUrlScreen(
            initialUrl = preferences.serverUrl,
            busy = busy,
            status = status,
            onSave = { url ->
                launchAction {
                    repository.updateServerUrl(url)
                    page = if (preferences.token() == null) Page.LOGIN else Page.HOME
                }
            },
        )
        Page.LOGIN -> LoginScreen(
            busy = busy,
            status = status,
            onLogin = { username, password, deviceName ->
                launchAction {
                    repository.login(username, password, deviceName)
                    page = Page.HOME
                }
            },
            onChangeServer = { page = Page.SERVER_URL },
        )
        Page.HOME -> HomeScreen(
            accounts = accountCards,
            queuedCount = queuedCount,
            busy = busy,
            status = status,
            onAddAccount = { page = Page.ADD_ACCOUNT },
            onPause = { id, paused ->
                launchAction { repository.setPaused(id, paused) }
            },
            onRetry = {
                launchAction {
                    repository.retryQueue()
                    status = "Queued writes checked."
                }
            },
            onServer = { page = Page.SERVER_URL },
            onSignOut = {
                launchAction {
                    repository.signOut()
                    accountCards = emptyList()
                    page = Page.LOGIN
                }
            },
        )
        Page.ADD_ACCOUNT -> AddAccountScreen(
            busy = busy,
            status = status,
            onBack = { page = Page.HOME },
            onSave = { draft, password ->
                launchAction {
                    status = repository.addAccount(draft, password)
                    page = Page.HOME
                }
            },
        )
    }
}

@Composable
private fun ServerUrlScreen(
    initialUrl: String,
    busy: Boolean,
    status: String,
    onSave: (String) -> Unit,
) {
    var url by remember(initialUrl) { mutableStateOf(initialUrl) }
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Server URL", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = url,
            onValueChange = { url = it },
            label = { Text("HTTPS server URL") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Text("The API path /api/v1 is added automatically when needed.")
        StatusMessage(status)
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { onSave(url) },
            enabled = !busy && url.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            ActionLabel("Save server", busy)
        }
    }
}

@Composable
private fun LoginScreen(
    busy: Boolean,
    status: String,
    onLogin: (String, String, String) -> Unit,
    onChangeServer: () -> Unit,
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var deviceName by remember { mutableStateOf("") }
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Sign in to your system account", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(username, { username = it }, label = { Text("Username") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(
            password,
            { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(deviceName, { deviceName = it }, label = { Text("Device name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        StatusMessage(status)
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = { onLogin(username.trim(), password, deviceName.trim()) },
            enabled = !busy && username.isNotBlank() && password.isNotEmpty() && deviceName.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            ActionLabel("Log in", busy)
        }
        OutlinedButton(onClick = onChangeServer, modifier = Modifier.fillMaxWidth()) {
            Text("Change server")
        }
    }
}

@Composable
private fun HomeScreen(
    accounts: List<AccountCard>,
    queuedCount: Int,
    busy: Boolean,
    status: String,
    onAddAccount: () -> Unit,
    onPause: (Long, Boolean) -> Unit,
    onRetry: () -> Unit,
    onServer: () -> Unit,
    onSignOut: () -> Unit,
) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Accounts", style = MaterialTheme.typography.headlineSmall)
            OutlinedButton(onClick = onServer, enabled = !busy) { Text("Server") }
        }
        Button(onClick = onAddAccount, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
            Text("Add account")
        }
        if (queuedCount > 0) {
            Text("$queuedCount write(s) waiting to sync.")
            Button(onClick = onRetry, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Retry queued writes")
            }
        }
        StatusMessage(status)
        if (busy) CircularProgressIndicator()
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(accounts, key = AccountCard::id) { account ->
                AccountCardView(account, busy, onPause)
            }
        }
        OutlinedButton(onClick = onSignOut, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
            Text("Sign out")
        }
    }
}

@Composable
private fun AccountCardView(
    account: AccountCard,
    busy: Boolean,
    onPause: (Long, Boolean) -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(account.name, style = MaterialTheme.typography.titleMedium)
            Text("${account.type} | ${account.identifier.orEmpty()}")
            Text("Balance: ${account.balanceEgp ?: "--"}")
            Text("New messages: ${account.newMessageCount}")
            Text("Status: ${account.status}")
            OutlinedButton(
                onClick = { onPause(account.id, account.status != "paused") },
                enabled = !busy,
            ) {
                Text(if (account.status == "paused") "Resume" else "Pause")
            }
        }
    }
}

@Composable
private fun AddAccountScreen(
    busy: Boolean,
    status: String,
    onBack: () -> Unit,
    onSave: (AccountDraft, String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("wallet") }
    var number by remember { mutableStateOf("") }
    var sender by remember { mutableStateOf("") }
    var depositKeywords by remember { mutableStateOf("") }
    var withdrawalKeywords by remember { mutableStateOf("") }
    var readDeposits by remember { mutableStateOf(true) }
    var readWithdrawals by remember { mutableStateOf(true) }
    var password by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item { Text("Add account", style = MaterialTheme.typography.headlineSmall) }
        item {
            OutlinedTextField(name, { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
        }
        item { AccountTypePicker(type) { type = it } }
        item {
            OutlinedTextField(number, { number = it }, label = { Text("Number / IBAN") }, modifier = Modifier.fillMaxWidth())
        }
        if (type != "post_office") {
            item {
                Text("Message filter")
                OutlinedTextField(sender, { sender = it }, label = { Text("Sender filter") }, modifier = Modifier.fillMaxWidth())
            }
        }
        if (type != "post_office") {
            item {
                OutlinedTextField(
                    depositKeywords,
                    { depositKeywords = it },
                    label = { Text("Deposit keywords (comma or line separated)") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                OutlinedTextField(
                    withdrawalKeywords,
                    { withdrawalKeywords = it },
                    label = { Text("Withdrawal keywords (comma or line separated)") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                ReadingSwitch("Read deposits", readDeposits) { readDeposits = it }
                ReadingSwitch("Read withdrawals", readWithdrawals) { readWithdrawals = it }
            }
        }
        item {
            OutlinedTextField(
                password,
                { password = it },
                label = { Text("Confirm password for account creation") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item { StatusMessage(status) }
        item {
            Button(
                onClick = {
                    onSave(
                        AccountDraft(
                            name = name,
                            type = type,
                            number = number,
                            senderFilter = sender,
                            depositKeywords = parseKeywords(depositKeywords),
                            withdrawalKeywords = parseKeywords(withdrawalKeywords),
                            readDeposits = readDeposits,
                            readWithdrawals = readWithdrawals,
                        ),
                        password,
                    )
                    password = ""
                },
                enabled = !busy && name.isNotBlank() && password.isNotEmpty(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                ActionLabel("Save account", busy)
            }
            OutlinedButton(onClick = onBack, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
                Text("Cancel")
            }
        }
    }
}

@Composable
private fun AccountTypePicker(selected: String, onSelected: (String) -> Unit) {
    val options = listOf("wallet", "bank", "instapay", "post_office", "other")
    var expanded by remember { mutableStateOf(false) }
    Column {
        Text("Type")
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
            Text(selected)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        onSelected(option)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
@Composable
private fun ReadingSwitch(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun StatusMessage(message: String) {
    if (message.isNotBlank()) {
        Text(message, color = MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun ActionLabel(label: String, busy: Boolean) {
    if (busy) CircularProgressIndicator() else Text(label)
}

private fun parseKeywords(value: String): List<String> =
    value.split(',', '\n').map(String::trim).filter(String::isNotEmpty)
