<template>
	<v-drawer
		v-model="internalActive"
		:title="t('editing_in_batch', { count: primaryKeys.length })"
		persistent
		@cancel="cancel"
	>
		<template #actions>
			<v-button v-tooltip.bottom="t('save')" icon rounded :loading="saving" @click="save">
				<v-icon name="check" />
			</v-button>
		</template>

		<div class="drawer-batch-content">
			<v-form
				v-model="internalEdits"
				:collection="collection"
				batch-mode
				primary-key="+"
				:validation-errors="validationErrors"
			/>
		</div>
	</v-drawer>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { defineComponent, ref, computed, PropType, toRefs } from 'vue';
import api from '@/api';
import { VALIDATION_TYPES } from '@/constants';
import { APIError } from '@/types/error';
import { unexpectedError } from '@/utils/unexpected-error';

export default defineComponent({
	props: {
		active: {
			type: Boolean,
			default: false,
		},
		collection: {
			type: String,
			required: true,
		},
		edits: {
			type: Object as PropType<Record<string, any>>,
			default: undefined,
		},
		primaryKeys: {
			type: Array as PropType<(number | string)[]>,
			required: true,
		},
	},
	emits: ['update:active', 'refresh'],
	setup(props, { emit }) {
		const { t } = useI18n();

		const { internalEdits } = useEdits();
		const { internalActive } = useActiveState();
		const { save, cancel, saving, validationErrors } = useActions();

		const { collection } = toRefs(props);

		return { t, internalActive, internalEdits, save, saving, cancel, validationErrors };

		function useEdits() {
			const localEdits = ref<Record<string, any>>({});

			const internalEdits = computed<Record<string, any>>({
				get() {
					if (props.edits !== undefined) {
						return {
							...props.edits,
							...localEdits.value,
						};
					}

					return localEdits.value;
				},
				set(newEdits) {
					localEdits.value = newEdits;
				},
			});

			return { internalEdits };
		}

		function useActiveState() {
			const localActive = ref(false);

			const internalActive = computed({
				get() {
					return props.active === undefined ? localActive.value : props.active;
				},
				set(newActive: boolean) {
					localActive.value = newActive;
					emit('update:active', newActive);
				},
			});

			return { internalActive };
		}

		function useActions() {
			const saving = ref(false);
			const validationErrors = ref([]);

			const endpoint = computed(() => {
				return collection.value.startsWith('directus_')
					? `/${collection.value.substring(9)}`
					: `/items/${collection.value}`;
			});

			return { save, cancel, saving, validationErrors };

			async function save() {
				saving.value = true;

				try {
					await api.patch(endpoint.value, {
						keys: props.primaryKeys,
						data: internalEdits.value,
					});

					emit('refresh');

					internalActive.value = false;
					internalEdits.value = {};
				} catch (err: any) {
					validationErrors.value = err.response.data.errors
						.filter((err: APIError) => VALIDATION_TYPES.includes(err?.extensions?.code))
						.map((err: APIError) => {
							return err.extensions;
						});

					const otherErrors = err.response.data.errors.filter(
						(err: APIError) => VALIDATION_TYPES.includes(err?.extensions?.code) === false
					);

					if (otherErrors.length > 0) {
						otherErrors.forEach(unexpectedError);
					}
				} finally {
					saving.value = false;
				}
			}

			function cancel() {
				internalActive.value = false;
				internalEdits.value = {};
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.v-divider {
	margin: 52px 0;
}

.drawer-batch-content {
	padding: var(--content-padding);
	padding-bottom: var(--content-padding-bottom);
}
</style>