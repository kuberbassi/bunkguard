import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform, Alert, Dimensions } from 'react-native';
import { theme } from '../theme';
import { X, Save, BookOpen, User, MapPin, AlertTriangle, Target, Briefcase, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const AddSubjectModal = ({ visible, onClose, onSave, onDelete, initialData, isDark }) => {

    // AMOLED Theme
    const c = {
        glassBg: isDark ? ['rgba(10, 10, 10, 1.0)', 'rgba(20, 20, 20, 1.0)'] : ['rgba(255, 255, 255, 1.0)', 'rgba(248, 249, 250, 1.0)'],
        glassBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        text: isDark ? '#FFF' : '#000',
        subtext: isDark ? '#9CA3AF' : '#6B7280',
        primary: '#0A84FF',
        surface: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        inputBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        danger: '#FF3B30',
    };



    const styles = getStyles(c, isDark);

    // Form State
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [professor, setProfessor] = useState('');
    const [classroom, setClassroom] = useState('');
    const [semester, setSemester] = useState('1');
    const [syllabus, setSyllabus] = useState('');
    const [categories, setCategories] = useState(['Theory']);

    // Manual Override & Targets
    const [attended, setAttended] = useState('');
    const [total, setTotal] = useState('');
    const [practicalTotal, setPracticalTotal] = useState('');
    const [assignmentTotal, setAssignmentTotal] = useState('');

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name || '');
                setCode(initialData.code || '');
                setProfessor(initialData.professor || '');
                setClassroom(initialData.classroom || '');
                setSemester(String(initialData.semester || '1'));
                setSyllabus(initialData.syllabus || '');
                setCategories(initialData.categories || ['Theory']);
                setAttended(String(initialData.attended || 0));
                setTotal(String(initialData.total || 0));
                const pTotal = initialData.practicals?.total || 10;
                setPracticalTotal(String(pTotal));
                const aTotal = initialData.assignments?.total || 4;
                setAssignmentTotal(String(aTotal));
            } else {
                resetForm();
            }
        }
    }, [visible, initialData]);

    const resetForm = () => {
        setName(''); setCode(''); setProfessor(''); setClassroom('');
        setSemester('1'); setSyllabus(''); setCategories(['Theory']);
        setAttended('0'); setTotal('0'); setPracticalTotal('10'); setAssignmentTotal('4');
    };

    const handleSave = () => {
        if (!name.trim()) return Alert.alert('Required', 'Subject Name is required.');

        const data = {
            name, code, professor, classroom,
            semester: parseInt(semester), syllabus, categories,
            attended: parseInt(attended) || 0,
            total: parseInt(total) || 0,
            practical_total: parseInt(practicalTotal) || 0,
            assignment_total: parseInt(assignmentTotal) || 0,
            isOverride: true
        };
        if (initialData) data.subject_id = initialData._id;
        onSave(data);
    };

    const toggleCategory = (cat) => {
        setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
                <LinearGradient colors={c.glassBg} style={styles.modalContent}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>{initialData ? 'Edit Subject' : 'New Subject'}</Text>
                            <Text style={styles.headerSub}>{initialData ? 'Modify course details' : 'Add a new course to track'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {initialData && (
                                <TouchableOpacity
                                    onPress={() => {
                                        Alert.alert(
                                            'Delete Subject',
                                            `Are you sure you want to delete ${initialData.name}?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Delete', style: 'destructive', onPress: () => onDelete(initialData._id) }
                                            ]
                                        );
                                    }}
                                    style={[styles.closeBtn, { backgroundColor: c.danger + '20' }]}
                                >
                                    <Trash2 size={20} color={c.danger} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color={c.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                            {/* Section: Basic Info */}
                            <Text style={styles.sectionLabel}>Basic Info</Text>

                            <View style={styles.inputGroup}>
                                <View style={styles.inputIcon}><BookOpen size={18} color={c.primary} /></View>
                                <TextInput
                                    style={styles.input} placeholder="Subject Name (e.g. Maths)" placeholderTextColor={c.subtext}
                                    value={name} onChangeText={setName}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.prefix}>#</Text>
                                    <TextInput
                                        style={styles.input} placeholder="Code" placeholderTextColor={c.subtext}
                                        value={code} onChangeText={setCode}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                    <TextInput
                                        style={styles.input} placeholder="Sem" keyboardType='numeric' placeholderTextColor={c.subtext}
                                        value={semester} onChangeText={setSemester}
                                    />
                                </View>
                            </View>

                            {/* Section: Details */}
                            <Text style={styles.sectionLabel}>Details</Text>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <View style={styles.inputIcon}><User size={18} color={c.subtext} /></View>
                                    <TextInput
                                        style={styles.input} placeholder="Professor" placeholderTextColor={c.subtext}
                                        value={professor} onChangeText={setProfessor}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                    <View style={styles.inputIcon}><MapPin size={18} color={c.subtext} /></View>
                                    <TextInput
                                        style={styles.input} placeholder="Room" placeholderTextColor={c.subtext}
                                        value={classroom} onChangeText={setClassroom}
                                    />
                                </View>
                            </View>

                            {/* Categories */}
                            <Text style={styles.sectionLabel}>Category</Text>
                            <View style={styles.chipRow}>
                                {['Theory', 'Practical', 'Assignment', 'Project'].map(cat => {
                                    const isActive = categories.includes(cat);
                                    return (
                                        <TouchableOpacity key={cat} onPress={() => toggleCategory(cat)}
                                            style={[styles.chip, isActive && { backgroundColor: c.primary, borderColor: c.primary }]}
                                        >
                                            <Text style={[styles.chipText, isActive && { color: '#FFF' }]}>{cat}</Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>

                            {/* Section: Targets */}
                            {(categories.includes('Practical') || categories.includes('Assignment')) && (
                                <View style={[styles.overrideCard, { marginTop: 16 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                                        <Target size={16} color={c.primary} />
                                        <Text style={[styles.overrideTitle, { color: c.primary }]}>Component Targets</Text>
                                    </View>
                                    <View style={styles.row}>
                                        {categories.includes('Practical') && (
                                            <View style={{ flex: 1, alignItems: 'center' }}>
                                                <Text style={styles.statLabel}>PRACTICALS</Text>
                                                <TextInput style={styles.statInput} value={practicalTotal} onChangeText={setPracticalTotal} keyboardType='numeric' placeholder="10" placeholderTextColor={c.subtext} />
                                            </View>
                                        )}
                                        {categories.includes('Practical') && categories.includes('Assignment') && (
                                            <View style={{ width: 1, height: 40, backgroundColor: c.glassBorder }} />
                                        )}
                                        {categories.includes('Assignment') && (
                                            <View style={{ flex: 1, alignItems: 'center' }}>
                                                <Text style={styles.statLabel}>ASSIGNMENTS</Text>
                                                <TextInput style={styles.statInput} value={assignmentTotal} onChangeText={setAssignmentTotal} keyboardType='numeric' placeholder="4" placeholderTextColor={c.subtext} />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Section: Override */}
                            <LinearGradient colors={[isDark ? '#1a1a1a' : '#f9f9f9', isDark ? '#111' : '#f0f0f0']} style={styles.overrideCard}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                                    <AlertTriangle size={16} color="#F59E0B" />
                                    <Text style={styles.overrideTitle}>Manual Override</Text>
                                </View>

                                <View style={styles.row}>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <Text style={styles.statLabel}>ATTENDED</Text>
                                        <TextInput style={styles.statInput} value={attended} onChangeText={setAttended} keyboardType='numeric' placeholder="0" placeholderTextColor={c.subtext} />
                                    </View>
                                    <View style={{ width: 1, height: 40, backgroundColor: c.glassBorder }} />
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <Text style={styles.statLabel}>TOTAL</Text>
                                        <TextInput style={styles.statInput} value={total} onChangeText={setTotal} keyboardType='numeric' placeholder="0" placeholderTextColor={c.subtext} />
                                    </View>
                                </View>
                            </LinearGradient>

                            <View style={{ height: 100 }} />
                        </ScrollView>
                    </KeyboardAvoidingView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveText}>Save Details</Text>
                        </TouchableOpacity>
                    </View>

                </LinearGradient>
            </View>
        </Modal>
    );
};

const getStyles = (c, isDark) => StyleSheet.create({
    modalContent: {
        height: '95%', borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingTop: 24, paddingHorizontal: 4, borderWidth: 1, borderColor: c.glassBorder
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingHorizontal: 24, marginBottom: 20
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: c.text },
    headerSub: { fontSize: 13, color: c.subtext, marginTop: 4 },
    closeBtn: { padding: 8, backgroundColor: c.surface, borderRadius: 20 },

    scrollContent: { paddingHorizontal: 20 },

    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.subtext, textTransform: 'uppercase', marginTop: 24, marginBottom: 12, letterSpacing: 1 },

    inputGroup: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg,
        borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 12,
        borderWidth: 1, borderColor: c.glassBorder
    },
    inputIcon: { marginRight: 12 },
    prefix: { fontSize: 16, color: c.subtext, marginRight: 8, fontWeight: '700' },
    input: { flex: 1, color: c.text, fontSize: 16, fontWeight: '600', height: '100%' },
    row: { flexDirection: 'row' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
        paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20,
        borderWidth: 1, borderColor: c.glassBorder, backgroundColor: c.surface
    },
    chipText: { color: c.subtext, fontWeight: '700', fontSize: 13 },

    overrideCard: {
        marginTop: 30, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: c.glassBorder
    },
    overrideTitle: { fontSize: 13, fontWeight: '800', color: '#F59E0B', letterSpacing: 0.5 },
    statLabel: { fontSize: 11, fontWeight: '800', color: c.subtext, marginBottom: 8 },
    statInput: { fontSize: 24, fontWeight: '800', color: c.text, textAlign: 'center', width: '100%' },

    footer: {
        padding: 20, borderTopWidth: 1, borderTopColor: c.glassBorder,
        position: 'absolute', bottom: 0, left: 0, right: 0
    },
    saveBtn: {
        backgroundColor: c.primary, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center', shadowColor: c.primary,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },
    saveText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});

export default AddSubjectModal;
