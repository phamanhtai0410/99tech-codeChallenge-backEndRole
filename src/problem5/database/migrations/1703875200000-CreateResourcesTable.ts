import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateResourcesTable1703875200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'resources',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['document', 'image', 'video', 'audio', 'other'],
            default: "'other'",
            isNullable: false
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'pending', 'archived'],
            default: "'active'",
            isNullable: false
          },
          {
            name: 'value',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false
          }
        ],
        indices: [
          {
            name: 'IDX_RESOURCES_NAME',
            columnNames: ['name']
          },
          {
            name: 'IDX_RESOURCES_TYPE',
            columnNames: ['type']
          },
          {
            name: 'IDX_RESOURCES_STATUS',
            columnNames: ['status']
          },
          {
            name: 'IDX_RESOURCES_VALUE',
            columnNames: ['value']
          },
          {
            name: 'IDX_RESOURCES_CREATED_AT',
            columnNames: ['createdAt']
          },
          {
            name: 'IDX_RESOURCES_TYPE_STATUS',
            columnNames: ['type', 'status']
          },
          {
            name: 'IDX_RESOURCES_STATUS_CREATED',
            columnNames: ['status', 'createdAt']
          }
        ]
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('resources');
  }
}