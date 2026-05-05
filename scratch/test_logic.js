
const epicMap = {
    'KEY-1': {
        startDate: null,
        derivedStartDate: null,
        derivedEndDate: null,
        children: [],
        totalIssues: 0,
        completedIssues: 0
    }
};

const allChildren = [
    {
        key: 'CHILD-1',
        fields: {
            parent: { key: 'KEY-1' },
            status: { name: 'Done', statusCategory: { key: 'done' } },
            created: '2023-01-01',
            resolutiondate: '2023-01-02',
            summary: 'Child 1',
            issuetype: { name: 'Story' }
        }
    }
];

allChildren.forEach(child => {
    const parentKey = child.fields.parent?.key;
    if (parentKey && epicMap[parentKey]) {
        const isCancelled = false;
        if (isCancelled) return;

        epicMap[parentKey].totalIssues++;
        const isDone = true;
        if (isDone) {
            epicMap[parentKey].completedIssues++;
        }

        epicMap[parentKey].children.push({ key: child.key });

        const childCreated = child.fields.created;
        const childResolved = child.fields.resolutiondate;

        if (!epicMap[parentKey].startDate || new Date(childCreated) < new Date(epicMap[parentKey].startDate)) {
            if (!epicMap[parentKey].startDate) {
                 if (!epicMap[parentKey].derivedStartDate || new Date(childCreated) < new Date(epicMap[parentKey].derivedStartDate)) {
                     epicMap[parentKey].derivedStartDate = childCreated;
                 }
            }
        }

        if (isDone && childResolved) {
            if (!epicMap[parentKey].derivedEndDate || new Date(childResolved) > new Date(epicMap[parentKey].derivedEndDate)) {
                epicMap[parentKey].derivedEndDate = childResolved;
            }
        }
    }
});

console.log("Success!");
