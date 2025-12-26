import apiClient, { handleApiResponse } from './client';
import { API_ENDPOINTS } from '../constants';
import type {
  SSHConnection,
  PaginatedResponse,
  VersionHistory,
} from '../../types';

/**
 * Get all connections
 */
export async function getConnections(): Promise<SSHConnection[]> {
  const response = await apiClient.get<{ data: SSHConnection[] }>(
    API_ENDPOINTS.CONNECTIONS.LIST
  );
  return handleApiResponse(response);
}

/**
 * Get single connection by ID
 */
export async function getConnection(id: string): Promise<SSHConnection> {
  const response = await apiClient.get<{ data: SSHConnection }>(
    API_ENDPOINTS.CONNECTIONS.GET(id)
  );
  return handleApiResponse(response);
}

/**
 * Create new connection
 */
export async function createConnection(
  connection: Omit<SSHConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'version'>
): Promise<SSHConnection> {
  const response = await apiClient.post<{ data: SSHConnection }>(
    API_ENDPOINTS.CONNECTIONS.CREATE,
    connection
  );
  return handleApiResponse(response);
}

/**
 * Update connection
 */
export async function updateConnection(
  id: string,
  updates: Partial<SSHConnection>
): Promise<SSHConnection> {
  const response = await apiClient.put<{ data: SSHConnection }>(
    API_ENDPOINTS.CONNECTIONS.UPDATE(id),
    updates
  );
  return handleApiResponse(response);
}

/**
 * Delete connection (soft delete)
 */
export async function deleteConnection(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.CONNECTIONS.DELETE(id));
}

/**
 * Get connection version history
 */
export async function getConnectionVersions(id: string): Promise<VersionHistory[]> {
  const response = await apiClient.get<{ data: VersionHistory[] }>(
    API_ENDPOINTS.CONNECTIONS.VERSIONS(id)
  );
  return handleApiResponse(response);
}

/**
 * Restore connection to specific version
 */
export async function restoreConnectionVersion(
  id: string,
  version: number
): Promise<SSHConnection> {
  const response = await apiClient.post<{ data: SSHConnection }>(
    API_ENDPOINTS.CONNECTIONS.RESTORE(id, version)
  );
  return handleApiResponse(response);
}

/**
 * Get deleted connections
 */
export async function getDeletedConnections(): Promise<SSHConnection[]> {
  const response = await apiClient.get<{ data: SSHConnection[] }>(
    API_ENDPOINTS.CONNECTIONS.DELETED
  );
  return handleApiResponse(response);
}

/**
 * Recover deleted connection
 */
export async function recoverConnection(id: string): Promise<SSHConnection> {
  const response = await apiClient.post<{ data: SSHConnection }>(
    API_ENDPOINTS.CONNECTIONS.RECOVER(id)
  );
  return handleApiResponse(response);
}

/**
 * Import connections from OpenSSH config
 */
export async function importOpenSSHConfig(configContent: string): Promise<SSHConnection[]> {
  const response = await apiClient.post<{ data: SSHConnection[] }>(
    API_ENDPOINTS.IMPORT.OPENSSH,
    { config: configContent }
  );
  return handleApiResponse(response);
}

/**
 * Import connections from PuTTY backup
 */
export async function importPuTTYBackup(backupFile: File): Promise<SSHConnection[]> {
  const formData = new FormData();
  formData.append('file', backupFile);
  
  const response = await apiClient.post<{ data: SSHConnection[] }>(
    API_ENDPOINTS.IMPORT.PUTTY,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return handleApiResponse(response);
}

/**
 * Import connections from Termius backup
 */
export async function importTermiusBackup(backupFile: File): Promise<SSHConnection[]> {
  const formData = new FormData();
  formData.append('file', backupFile);
  
  const response = await apiClient.post<{ data: SSHConnection[] }>(
    API_ENDPOINTS.IMPORT.TERMIUS,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return handleApiResponse(response);
}

/**
 * Export connections
 */
export async function exportConnections(format: 'json' | 'csv' | 'openssh'): Promise<Blob> {
  const response = await apiClient.get(API_ENDPOINTS.EXPORT(format), {
    responseType: 'blob',
  });
  return response.data;
}

