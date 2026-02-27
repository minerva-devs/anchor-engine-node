#include <windows.h>
#include <stdio.h>

int main() {
    HMODULE hDll = LoadLibraryA("anchor_core.dll");
    if (!hDll) {
        printf("Failed to load DLL\n");
        return 1;
    }
    
    // Try to get function pointers
    FARPROC pBeginTransaction = GetProcAddress(hDll, "database_begin_transaction");
    FARPROC pCommitTransaction = GetProcAddress(hDll, "database_commit_transaction");
    FARPROC pCreate = GetProcAddress(hDll, "database_create");
    
    printf("database_begin_transaction: %p\n", pBeginTransaction);
    printf("database_commit_transaction: %p\n", pCommitTransaction);
    printf("database_create: %p\n", pCreate);
    
    FreeLibrary(hDll);
    return 0;
}